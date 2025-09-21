# /backend/scraper/scraper_logic.py
import selenium
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
    StaleElementReferenceException,
    ElementClickInterceptedException
)
import re
import base64
import time
import requests
import os
import logging
import json
from datetime import datetime, timedelta
import traceback
import nopecha

# --- Constants ---
DEFAULT_TIMEOUT = 30 # Increased default timeout
POLL_FREQUENCY = 0.2
MAX_LOGIN_RETRIES = 3
CAPTCHA_SOLVE_RETRIES = 2
LOGIN_URL = "https://dulms.deltauniv.edu.eg/Login.aspx"
QUIZZES_URL = "https://dulms.deltauniv.edu.eg/Quizzes/StudentQuizzes"
ASSIGNMENTS_URL = "https://dulms.deltauniv.edu.eg/Assignment/AssignmentStudentList"
ABSENCE_URL = "https://dulms.deltauniv.edu.eg/SemesterWorks/absence"
COURSE_REG_URL = "https://dulms.deltauniv.edu.eg/Registered/CoursesRegisteration"
LOGIN_SUCCESS_URL_PART = "Profile/StudentProfile"

# --- Logging Setup ---
logger = logging.getLogger(__name__)

# Import error tracking
from utils.error_tracker import ErrorTracker, ErrorType, detect_error_type

# --- Selenium Driver Initialization & Utility Functions ---
def initialize_driver(headless=True):
    logging.info("Initializing the Selenium driver...")
    options = Options()
    if headless: 
        options.add_argument("--headless=new")
    
    # Core stability options from working main_final.py
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--log-level=3")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    # Additional stability options for containerized environment
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-plugins")
    options.add_argument("--disable-web-security")
    options.add_argument("--disable-features=VizDisplayCompositor")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-backgrounding-occluded-windows")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--memory-pressure-off")
    
    # Set page load strategy
    options.page_load_strategy = 'normal'
    
    try:
        service = Service()
        driver = webdriver.Chrome(service=service, options=options)
        logging.info("Driver initialized successfully.")
        return driver
    except Exception as e:
        logging.error(f"Failed to initialize WebDriver: {e}")
        raise

def wait_for_element(driver, by, value, timeout=DEFAULT_TIMEOUT):
    try:
        return WebDriverWait(driver, timeout, poll_frequency=POLL_FREQUENCY).until(
            EC.visibility_of_element_located((by, value))
        )
    except TimeoutException:
        logger.warning(f"Timeout waiting for element: {by}={value}")
        return None

def safe_find_element(parent, by, value):
    try:
        return parent.find_element(by, value)
    except NoSuchElementException:
        return None

def safe_get_text(element):
    return element.text.strip() if element else ""

def click_element_robustly(driver, element_or_locator, timeout=20):
    """Enhanced robust clicking with multiple strategies"""
    if not element_or_locator:
        return False
    
    try:
        # Strategy 1: Standard Selenium click
        if isinstance(element_or_locator, tuple):
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable(element_or_locator)
            )
        else:
            element = element_or_locator
            WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable(element)
            )

        # Scroll into view with better positioning
        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center', inline: 'center', behavior: 'smooth'});", 
            element
        )
        time.sleep(1)

        # Try standard click
        element.click()
        logger.debug("Standard click successful")
        return True

    except Exception as e:
        logger.warning(f"Standard click failed: {e}. Trying alternative methods.")
        
        try:
            # Strategy 2: JavaScript click
            if isinstance(element_or_locator, tuple):
                element = driver.find_element(*element_or_locator)
            
            driver.execute_script("arguments[0].click();", element)
            logger.debug("JavaScript click successful")
            return True
            
        except Exception as js_e:
            logger.warning(f"JavaScript click failed: {js_e}. Trying action chains.")
            
            try:
                # Strategy 3: Action chains
                from selenium.webdriver.common.action_chains import ActionChains
                actions = ActionChains(driver)
                actions.move_to_element(element).click().perform()
                logger.debug("Action chains click successful")
                return True
                
            except Exception as action_e:
                logger.error(f"All click strategies failed. Final error: {action_e}")
                return False

def dismiss_notifications(driver):
    try:
        notification_lock = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".announcement-lock")))
        if notification_lock:
            dismiss_btn = safe_find_element(driver, By.CSS_SELECTOR, ".dismiss")
            if dismiss_btn and dismiss_btn.is_displayed():
                logger.info("Dismissing notification...")
                click_element_robustly(driver, dismiss_btn, timeout=5)
                # No delay after dismissing notifications
    except TimeoutException:
        logger.info("No notifications found.")

# --- Enhanced Network & CAPTCHA Handling ---
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_resilient_session():
    """Create a requests session with retry strategy"""
    session = requests.Session()
    
    retry_strategy = Retry(
        total=5,  # Increased total retries
        backoff_factor=2,  # Increased backoff factor
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "POST"]
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

def validate_captcha_services(fcb_api_key, nopecha_api_key):
    """Validate CAPTCHA service API keys before attempting login"""
    fcb_valid = validate_fcb_key(fcb_api_key)
    
    if not nopecha_api_key or nopecha_api_key.strip() == "":
        logger.warning("NopeCHA API key is missing or empty")
        return fcb_valid  # Return True only if FCB is valid
    
    # Test NopeCHA key validity
    try:
        nopecha.key = nopecha_api_key
        # Simple balance check to validate key
        test_response = nopecha.Recognition.balance()
        logger.info(f"NopeCHA balance check successful: {test_response}")
        return True  # If NopeCHA is valid, we can proceed
    except Exception as e:
        logger.error(f"NopeCHA API key validation failed: {e}")
        return fcb_valid # Return True only if FCB is valid
def validate_fcb_key(api_key):
    """Validate FreeCaptchaBypass API key"""
    if not api_key or api_key.strip() == "":
        logger.warning("FreeCaptchaBypass API key is missing or empty.")
        return False
    
    # Simple check, as FCB does not have a balance endpoint
    return True

def _solve_with_freecaptcha(api_key, image_base64, retries):
    session = create_resilient_session()
    
    for attempt in range(retries):
        try:
            logger.info(f"Solving CAPTCHA via FreeCaptchaBypass (attempt {attempt + 1}/{retries})...")
            start_time = time.time()
            
            api_url_create = "https://freecaptchabypass.com/createTask"
            task_payload = {
                "clientKey": api_key,
                "task": {
                    "type": "ImageToTextTask",
                    "body": image_base64,
                    # Add priority flag for faster processing (if supported)
                    "priority": 1
                }
            }
            
            # Reduced timeout for initial request to fail faster
            response_create = session.post(
                api_url_create, 
                json=task_payload, 
                timeout=15,  # Reduced from 30 to 15 seconds
                headers={'Content-Type': 'application/json'}
            )
            
            if response_create.status_code != 200:
                raise Exception(f"FCB API returned status {response_create.status_code}: {response_create.text}")
            
            task_result = response_create.json()
            
            if task_result.get("errorId") == 0:
                task_id = task_result.get("taskId")
                api_url_result = "https://freecaptchabypass.com/getTaskResult"
                result_payload = {"clientKey": api_key, "taskId": task_id}
                
                # Reduced polling time and intervals for faster failure detection
                poll_intervals = [2, 3, 4, 5, 6, 8, 10]  # Shorter intervals
                max_poll_time = 40  # Reduced from 60 to 40 seconds
                
                for poll_attempt in range(len(poll_intervals)):
                    if time.time() - start_time > max_poll_time:
                        logger.warning(f"FCB polling timeout after {max_poll_time}s, switching to NopeCHA")
                        raise TimeoutException(f"FCB polling timeout after {max_poll_time}s")
                        
                    wait_time = poll_intervals[poll_attempt]
                    logger.debug(f"Polling FCB attempt {poll_attempt + 1}, waiting {wait_time}s...")
                    time.sleep(wait_time)
                    
                    try:
                        response_result = session.post(
                            api_url_result, 
                            json=result_payload, 
                            timeout=10  # Reduced from 20 to 10 seconds
                        )
                        
                        result_data = response_result.json()
                        
                        if result_data.get("status") == "ready":
                            solution = result_data.get("solution", {}).get("text")
                            if solution:
                                total_time = time.time() - start_time
                                logger.info(f"FCB solved successfully: '{solution}' (took {total_time:.1f}s)")
                                return solution
                        elif result_data.get("status") == "processing":
                            continue
                        else:
                            logger.warning(f"FCB returned unexpected status: {result_data}")
                            raise Exception(f"FCB returned unexpected status: {result_data}")
                    
                    except requests.exceptions.Timeout:
                        logger.warning(f"FCB polling request {poll_attempt + 1} timed out")
                        if poll_attempt >= len(poll_intervals) - 1:
                            raise TimeoutException("FCB polling requests consistently timing out")
                        continue
                
                total_time = time.time() - start_time
                raise TimeoutException(f"FCB CAPTCHA solution timed out after {total_time:.1f}s of polling")
            else:
                error_desc = task_result.get('errorDescription', 'Unknown error')
                logger.error(f"FCB API Error: {error_desc}")
                raise Exception(f"FCB API Error: {error_desc}")
                
        except requests.exceptions.Timeout as e:
            logger.warning(f"FCB timeout on attempt {attempt + 1}: {e}")
            if attempt == retries - 1:
                raise Exception(f"FCB service consistently timing out after {retries} attempts")
            time.sleep(2)  # Shorter wait before retry
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"FCB network error on attempt {attempt + 1}: {e}")
            if attempt == retries - 1:
                raise Exception(f"FCB network error after {retries} attempts: {e}")
            time.sleep(2)  # Shorter wait before retry
            
        except Exception as e:
            logger.warning(f"FCB attempt {attempt + 1} failed: {e}")
            if attempt == retries - 1:
                raise
            time.sleep(1)  # Shorter wait before retry
    
    raise Exception("FreeCaptchaBypass failed after all retries")

def solve_captcha(fcb_api_key, nopecha_api_key, image_base64):
    """
    Optimized CAPTCHA solving with fast fallback strategy.
    Tries FCB first with aggressive timeout, then falls back to NopeCHA quickly.
    """
    start_time = time.time()
    
    # Strategy 1: Try FreeCaptchaBypass with fast timeout
    if validate_fcb_key(fcb_api_key):
        try:
            logger.info("Attempting FCB with 45-second timeout...")
            result = _solve_with_freecaptcha(fcb_api_key, image_base64, 1)  # Only 1 retry for speed
            total_time = time.time() - start_time
            logger.info(f"FCB solved in {total_time:.1f}s: '{result}'")
            return result
        except Exception as fcb_error:
            elapsed = time.time() - start_time
            logger.warning(f"FCB failed after {elapsed:.1f}s: {fcb_error}. Switching to NopeCHA...")
            
            # If FCB fails due to timeout, immediately try NopeCHA
            if "timeout" in str(fcb_error).lower() or elapsed > 30:
                logger.info("FCB timeout detected, fast-switching to NopeCHA")
    else:
        logger.info("FCB API key not available, using NopeCHA directly.")

    # Strategy 2: Fast NopeCHA fallback
    if not nopecha_api_key or not nopecha_api_key.strip():
        raise Exception("Both CAPTCHA services are unavailable - no valid API keys provided.")

    try:
        logger.info("Attempting NopeCHA (fast mode)...")
        nopecha.key = nopecha_api_key
        
        # Fast NopeCHA with timeout protection
        for attempt in range(2):  # Only 2 attempts
            try:
                # Use threading timeout for cross-platform compatibility
                import threading
                import queue
                
                def nopecha_solve():
                    try:
                        response = nopecha.Recognition.solve(type='textcaptcha', image_data=[image_base64])
                        return response['data'][0]
                    except Exception as e:
                        raise e
                
                # Create a queue to get the result
                result_queue = queue.Queue()
                exception_queue = queue.Queue()
                
                def worker():
                    try:
                        result = nopecha_solve()
                        result_queue.put(result)
                    except Exception as e:
                        exception_queue.put(e)
                
                # Start the worker thread
                worker_thread = threading.Thread(target=worker)
                worker_thread.daemon = True
                worker_thread.start()
                
                # Wait for result with timeout
                worker_thread.join(timeout=30)
                
                if worker_thread.is_alive():
                    logger.warning(f"NopeCHA attempt {attempt + 1} timed out after 30s")
                    if attempt == 1:  # Last attempt
                        raise Exception("NopeCHA consistently timing out")
                    time.sleep(1)
                    continue
                
                # Check for exceptions
                if not exception_queue.empty():
                    raise exception_queue.get()
                
                # Get the result
                if not result_queue.empty():
                    solution = result_queue.get()
                    total_time = time.time() - start_time
                    logger.info(f"NopeCHA solved in {total_time:.1f}s: '{solution}'")
                    return solution
                else:
                    raise Exception("NopeCHA returned no result")
                    
            except Exception as e:
                logger.warning(f"NopeCHA attempt {attempt + 1} failed: {e}")
                if attempt == 1:  # Last attempt
                    raise
                time.sleep(1)

    except Exception as nopecha_error:
        total_time = time.time() - start_time
        logger.error(f"Both CAPTCHA services failed after {total_time:.1f}s: {nopecha_error}")
        raise Exception("Both CAPTCHA services failed.") from nopecha_error

def get_captcha_image_base64(driver):
    logger.info("Capturing CAPTCHA image...")
    try:
        # Try multiple possible selectors for CAPTCHA image
        selectors = [
            "div.captach img",  # Original selector (with typo)
            "div.captcha img",  # Corrected selector
            ".captcha img",     # Alternative
            "img[src*='captcha']", # Generic captcha image
            "#captcha img"      # ID-based selector
        ]
        
        captcha_img_element = None
        for selector in selectors:
            try:
                captcha_img_element = WebDriverWait(driver, 5).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
                )
                logger.info(f"Found CAPTCHA image using selector: {selector}")
                break
            except TimeoutException:
                continue
        
        if not captcha_img_element:
            raise Exception("Could not find CAPTCHA image with any known selector")
        
        # Scroll into view and capture
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", captcha_img_element)
        time.sleep(0.2)
        img_bytes = captcha_img_element.screenshot_as_png
        logger.info("Captured CAPTCHA using element screenshot.")
        return base64.b64encode(img_bytes).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to capture CAPTCHA image: {e}")
        raise

# --- Login & Navigation ---
def login(driver, username, password, fcb_api_key, nopecha_api_key):
    logging.info(f"Attempting login for user: {username}")
    for attempt in range(MAX_LOGIN_RETRIES):
        logging.info(f"Login attempt {attempt + 1}/{MAX_LOGIN_RETRIES}...")
        try:
            # Fresh page load for each attempt
            driver.get(LOGIN_URL)
            time.sleep(2)  # Allow page to fully load
            
            # Wait for the login form to be present with extended timeout
            username_field = wait_for_element(driver, By.ID, "txtname", timeout=45)
            if not username_field:
                raise Exception("Login page did not load correctly.")
            
            # Re-find elements to avoid stale references
            password_field = wait_for_element(driver, By.ID, "txtPass", timeout=10)
            captcha_input = wait_for_element(driver, By.ID, "txt_captcha", timeout=10)
            
            if not password_field or not captcha_input:
                raise Exception("Login form elements not found.")

            # Clear and fill fields with error handling
            try:
                username_field.clear()
                username_field.send_keys(username)
                password_field.clear()
                password_field.send_keys(password)
            except Exception as e:
                logging.warning(f"Error filling login fields: {e}")
                # Try JavaScript approach
                driver.execute_script("arguments[0].value = arguments[1];", username_field, username)
                driver.execute_script("arguments[0].value = arguments[1];", password_field, password)

            # Handle CAPTCHA with retry logic
            captcha_solved = False
            for captcha_attempt in range(2):
                try:
                    captcha_base64 = get_captcha_image_base64(driver)
                    captcha_solution = solve_captcha(fcb_api_key, nopecha_api_key, captcha_base64)
                    
                    # Re-find captcha input to avoid stale reference
                    captcha_input = wait_for_element(driver, By.ID, "txt_captcha", timeout=10)
                    if not captcha_input:
                        raise Exception("CAPTCHA input field not found after solving.")
                    
                    # Clear and enter CAPTCHA with multiple strategies
                    try:
                        captcha_input.clear()
                        captcha_input.send_keys(captcha_solution)
                    except Exception as clear_error:
                        logging.warning(f"Standard CAPTCHA input failed: {clear_error}. Trying JavaScript.")
                        driver.execute_script("arguments[0].value = '';", captcha_input)
                        driver.execute_script("arguments[0].value = arguments[1];", captcha_input, captcha_solution)
                    
                    captcha_solved = True
                    break
                    
                except Exception as captcha_error:
                    logging.warning(f"CAPTCHA attempt {captcha_attempt + 1} failed: {captcha_error}")
                    if captcha_attempt == 1:
                        raise Exception(f"CAPTCHA solving failed after retries: {captcha_error}")
                    time.sleep(2)
            
            if not captcha_solved:
                raise Exception("Failed to solve CAPTCHA")
            
            # Submit form with multiple strategies
            try:
                password_field.send_keys(Keys.ENTER)
            except Exception as submit_error:
                logging.warning(f"Enter key submission failed: {submit_error}. Trying form submission.")
                try:
                    submit_button = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
                    submit_button.click()
                except Exception as button_error:
                    logging.warning(f"Button click failed: {button_error}. Trying JavaScript submission.")
                    driver.execute_script("document.forms[0].submit();")

            # Enhanced login verification with multiple checks
            login_successful = False
            
            # Check 1: Wait for URL change
            try:
                WebDriverWait(driver, 45).until_not(EC.url_contains("Login.aspx"))
                logging.info("URL changed from login page.")
                time.sleep(3)  # Allow page transition
                
                # Check 2: Look for dashboard elements
                dashboard_selectors = [
                    (By.CSS_SELECTOR, "a[href='/Profile/StudentProfile']"),
                    (By.CSS_SELECTOR, ".navbar-nav"),
                    (By.CSS_SELECTOR, "[href*='Profile']"),
                    (By.CSS_SELECTOR, ".user-menu")
                ]
                
                for selector in dashboard_selectors:
                    try:
                        WebDriverWait(driver, 30).until(EC.presence_of_element_located(selector))
                        logging.info(f"Dashboard element found: {selector}")
                        login_successful = True
                        break
                    except TimeoutException:
                        continue
                
                if login_successful:
                    logging.info("Dashboard content verified. Login successful!")
                    dismiss_notifications(driver)
                    return  # Success!
                else:
                    raise Exception("Dashboard elements not found after login")
                    
            except TimeoutException:
                # Check if we're still on login page or got an error
                current_url = driver.current_url
                if "Login.aspx" in current_url:
                    page_source = driver.page_source.lower()
                    if "invalid" in page_source or "incorrect" in page_source or "wrong" in page_source:
                        raise Exception("Invalid credentials detected")
                    else:
                        raise Exception("Login form submission timeout")
                else:
                    raise Exception(f"Unexpected page after login: {current_url}")

        except Exception as e:
            logging.error(f"Login attempt {attempt + 1} failed: {e}", exc_info=True)
            
            # Take screenshot for debugging
            try:
                driver.save_screenshot(f"login_error_attempt_{attempt+1}.png")
            except:
                pass
            
            # Check for specific error conditions
            try:
                page_source = driver.page_source.lower()
                if "invalid" in page_source or "incorrect" in page_source or "wrong" in page_source:
                    raise Exception("Invalid credentials provided by user.")
            except:
                pass
            
            if attempt >= MAX_LOGIN_RETRIES - 1:
                logging.error("Maximum login attempts reached. Aborting.", exc_info=True)
                raise Exception("Maximum login attempts reached.")
            
            # Wait before retry
            time.sleep(5)
    
    raise Exception("All login attempts failed.")

def navigate_to_page(driver, url, wait_element_selector):
    logging.info(f"Navigating to: {url}")
    max_attempts = 2
    
    for attempt in range(max_attempts):
        try:
            # Check session validity before navigation
            try:
                current_url = driver.current_url
                logging.debug(f"Current URL before navigation: {current_url}")
            except Exception as session_error:
                logging.error(f"Session check failed before navigation: {session_error}")
                raise Exception("WebDriver session invalid before navigation")
            
            # Navigate with timeout handling
            logging.info(f"Navigation attempt {attempt + 1}/{max_attempts} to: {url}")
            driver.get(url)
            
            # Wait for page load with multiple strategies
            page_loaded = False
            
            # Strategy 1: Wait for specific element
            try:
                WebDriverWait(driver, 45).until(
                    EC.presence_of_element_located(wait_element_selector)
                )
                page_loaded = True
                logging.info("Target element found - page loaded successfully")
            except TimeoutException:
                logging.warning(f"Target element not found: {wait_element_selector}")
                
                # Strategy 2: Check if page has any content
                try:
                    WebDriverWait(driver, 15).until(
                        lambda d: d.execute_script("return document.readyState") == "complete"
                    )
                    
                    # Check if we have some basic page structure
                    body_elements = driver.find_elements(By.TAG_NAME, "body")
                    if body_elements and len(body_elements[0].text.strip()) > 0:
                        logging.info("Page has content, proceeding despite missing target element")
                        page_loaded = True
                    else:
                        logging.warning("Page appears empty")
                        
                except TimeoutException:
                    logging.error("Page did not finish loading")
            
            if page_loaded:
                # Additional wait for dynamic content
                time.sleep(2)
                logging.info("Successfully navigated and verified page content.")
                return True
            else:
                if attempt < max_attempts - 1:
                    logging.warning(f"Navigation attempt {attempt + 1} failed, retrying...")
                    time.sleep(5)
                    continue
                else:
                    logging.error(f"All navigation attempts failed for {url}")
                    break
                    
        except Exception as e:
            logging.error(f"Navigation attempt {attempt + 1} failed with error: {e}")
            
            # Check for session-related errors
            if "invalid session id" in str(e).lower():
                logging.error("Session invalid during navigation")
                raise Exception("WebDriver session became invalid during navigation")
            
            if attempt < max_attempts - 1:
                logging.info("Retrying navigation after error...")
                time.sleep(5)
                continue
            else:
                logging.error(f"All navigation attempts failed due to errors")
                break
    
    # Take screenshot for debugging
    try:
        screenshot_name = f"nav_failed_{url.split('/')[-1]}_{int(time.time())}.png"
        driver.save_screenshot(screenshot_name)
        logging.info(f"Screenshot saved: {screenshot_name}")
    except Exception as screenshot_error:
        logging.warning(f"Could not save screenshot: {screenshot_error}")
    
    return False

def expand_course_panel(driver, course_element, max_retries=2):
    """
    Expand course panel with robust strategy based on working main_final.py
    """
    try:
        # Find the panel collapse element
        panel = course_element.find_element(By.CSS_SELECTOR, ".panel-collapse")
        
        # Check if already expanded (has 'in' class)
        if "in" in panel.get_attribute("class"):
            logger.debug("Panel already expanded")
            return True
        
        # Find the toggle element - use the exact selector from working script
        try:
            toggle_element = course_element.find_element(By.CSS_SELECTOR, ".accordion-toggle")
        except NoSuchElementException:
            try:
                toggle_element = course_element.find_element(By.CSS_SELECTOR, "a[data-toggle='collapse']")
            except NoSuchElementException:
                logger.error("No toggle element found for panel expansion")
                return False
        
        # Click the toggle element
        if click_element_robustly(driver, toggle_element, timeout=10):
            # Wait for expansion - check for 'in' class
            try:
                WebDriverWait(driver, 5).until(
                    lambda d: "in" in panel.get_attribute("class")
                )
                time.sleep(0.5)  # Small wait for content to load
                logger.debug("Panel expanded successfully")
                return True
            except TimeoutException:
                logger.warning("Panel expansion timeout - panel may not have expanded")
                return False
        else:
            logger.warning("Toggle click failed")
            return False
            
    except Exception as e:
        logger.error(f"Error expanding course panel: {e}")
        return False

# --- Data Scraping Functions ---
def scrape_quizzes(driver):
    logger.info("Starting quiz data extraction...")
    results = {
        "quizzes_with_results": [], 
        "quizzes_without_results": [], 
        "courses_processed": 0, 
        "total_quizzes_found": 0, 
        "courses_found_on_page": [], 
        "quiz_courses_with_no_items": [], 
        "quiz_courses_failed_expansion": []
    }
    
    try:
        courses = driver.find_elements(By.CSS_SELECTOR, "section.course-item")
        logger.info(f"Found {len(courses)} courses on quizzes page")
        
        for course in courses:
            course_name = safe_get_text(safe_find_element(course, By.CSS_SELECTOR, "strong.course-name")) or "Unknown Course"
            results["courses_found_on_page"].append(course_name)
            
            # --- NEW ROBUST LOGIC ---
            # Only attempt to expand panel, don't assume it will work
            was_expanded = expand_course_panel(driver, course)
            if not was_expanded:
                # The panel could not be expanded. Log it and move on immediately.
                logger.warning(f"Could not expand panel for '{course_name}' on Quizzes page. Skipping.")
                results["quiz_courses_failed_expansion"].append(course_name)
                continue  # <-- This is the crucial part
            
            # If we are here, the panel is successfully expanded. Now we scrape.
            results["courses_processed"] += 1
            
            # Look for quiz items in the expanded panel
            quiz_articles = course.find_elements(By.CSS_SELECTOR, "article.quiz-item")
            
            if not quiz_articles:
                logger.info(f"No quiz items found in expanded panel for '{course_name}'")
                results["quiz_courses_with_no_items"].append(course_name)
                continue
            
            logger.info(f"Found {len(quiz_articles)} quiz items in '{course_name}'")
            
            for quiz in quiz_articles:
                try:
                    results["total_quizzes_found"] += 1
                    quiz_data = {"course": course_name, "type": "Quiz"}
                    
                    # Extract quiz data with error handling for each field
                    quiz_data["name"] = safe_get_text(safe_find_element(quiz, By.CSS_SELECTOR, "a.quiz-name")) or "Unnamed Quiz"
                    
                    raw_status = safe_get_text(safe_find_element(quiz, By.CSS_SELECTOR, ".quiz-status"))
                    quiz_data["closed_at"] = raw_status.split("Closed at:")[-1].strip() if "Closed at:" in raw_status else raw_status
                    
                    grade_text = safe_get_text(safe_find_element(quiz, By.CSS_SELECTOR, ".graded-status"))
                    quiz_data["grade"] = grade_text if grade_text and grade_text != "--" else "Not Graded"
                    
                    # Categorize quiz based on grade status
                    if quiz_data["grade"] != "Not Graded":
                        results["quizzes_with_results"].append(quiz_data)
                    else:
                        results["quizzes_without_results"].append(quiz_data)
                        
                except Exception as quiz_error:
                    logger.error(f"Error extracting data for individual quiz in '{course_name}': {quiz_error}")
                    continue
                    
    except Exception as e:
        logger.error(f"Error during quiz extraction: {e}", exc_info=True)
    
    logger.info(f"Quiz extraction completed. Processed {results['courses_processed']} courses, found {results['total_quizzes_found']} quizzes")
    return results

def scrape_assignments(driver):
    logger.info("Starting assignment data extraction...")
    results = {
        "assignments": [], 
        "courses_processed": 0, 
        "total_assignments_found": 0, 
        "courses_found_on_page": [], 
        "assignment_courses_with_no_items": [], 
        "assignment_courses_failed_expansion": []
    }
    
    try:
        courses = driver.find_elements(By.CSS_SELECTOR, "section.course-item")
        logger.info(f"Found {len(courses)} courses on assignments page")
        
        for course in courses:
            course_name = safe_get_text(safe_find_element(course, By.CSS_SELECTOR, "strong.course-name")) or "Unknown Course"
            results["courses_found_on_page"].append(course_name)
            
            # --- NEW ROBUST LOGIC ---
            # Only attempt to expand panel, don't assume it will work
            was_expanded = expand_course_panel(driver, course)
            if not was_expanded:
                # The panel could not be expanded. Log it and move on immediately.
                logger.warning(f"Could not expand panel for '{course_name}' on Assignments page. Skipping.")
                results["assignment_courses_failed_expansion"].append(course_name)
                continue  # <-- This is the crucial part
            
            # If we are here, the panel is successfully expanded. Now we scrape.
            results["courses_processed"] += 1
            
            # Look for assignment items in the expanded panel
            assignment_articles = course.find_elements(By.CSS_SELECTOR, "article.assignment-item")
            
            if not assignment_articles:
                logger.info(f"No assignment items found in expanded panel for '{course_name}'")
                results["assignment_courses_with_no_items"].append(course_name)
                continue
            
            logger.info(f"Found {len(assignment_articles)} assignment items in '{course_name}'")
            
            for assignment in assignment_articles:
                try:
                    results["total_assignments_found"] += 1
                    data = {"course": course_name, "type": "Assignment"}
                    
                    # Extract assignment data with error handling for each field
                    data["name"] = safe_get_text(safe_find_element(assignment, By.CSS_SELECTOR, ".assign-name")) or "Unnamed Assignment"
                    data["submit_status"] = safe_get_text(safe_find_element(assignment, By.CSS_SELECTOR, ".submit-status")) or "Status Unknown"
                    
                    raw_date = safe_get_text(safe_find_element(assignment, By.CSS_SELECTOR, ".assign-status"))
                    data["closed_at"] = raw_date.split("Closed at:")[-1].strip() if "Closed at:" in raw_date else raw_date
                    
                    data["grading_status"] = safe_get_text(safe_find_element(assignment, By.CSS_SELECTOR, ".graded-status")) or "Not Graded Yet"
                    
                    results["assignments"].append(data)
                    
                except Exception as assignment_error:
                    logger.error(f"Error extracting data for individual assignment in '{course_name}': {assignment_error}")
                    continue
                    
    except Exception as e:
        logger.error(f"Error during assignment extraction: {e}", exc_info=True)
    
    logger.info(f"Assignment extraction completed. Processed {results['courses_processed']} courses, found {results['total_assignments_found']} assignments")
    return results

def scrape_absence_data(driver):
    """
    (REFINED) Scrapes absence data from the absence page based on actual HTML structure.
    Based on working main_final.py script.
    """
    logger.info("Starting absence data extraction...")
    absences = []
    try:
        # CORRECTED: Use the correct selector for course containers on the absence page.
        course_containers = driver.find_elements(By.CSS_SELECTOR, "div.panel-group.course-grp")
        logger.info(f"Found {len(course_containers)} course containers for absence checking.")

        for course in course_containers:
            # CORRECTED: Find course name from the correct element.
            course_name_elem = safe_find_element(course, By.CSS_SELECTOR, "a.accordion-toggle span")
            course_name = safe_get_text(course_name_elem) or "Unknown Course"
            
            if not expand_course_panel(driver, course):
                logger.warning(f"Could not expand panel for {course_name} (Absence), skipping.")
                continue
            
            # CORRECTED: Look for rows with absence status using the correct selector
            # Based on HTML structure: <i class="fa fa-times text-danger"></i>Absence
            absence_rows = course.find_elements(By.XPATH, ".//tr[td[contains(@class, 'text-danger') or contains(., 'Absence')]]")
            
            if not absence_rows:
                logger.info(f"No absence records found in expanded section for {course_name}.")
                continue
            
            logger.info(f"Found {len(absence_rows)} potential absence records in {course_name}.")
            
            for row in absence_rows:
                cells = row.find_elements(By.TAG_NAME, "td")
                # Ensure the row has enough cells to prevent IndexError
                if len(cells) >= 4:
                    # Check if this row actually contains an absence (4th column has "Absence" text)
                    status_cell = cells[3]
                    status_text = safe_get_text(status_cell)
                    
                    # Only add if it's actually an absence record
                    if "Absence" in status_text or status_cell.find_elements(By.CSS_SELECTOR, ".fa-times.text-danger"):
                        absences.append({
                            "course": course_name,
                            "type": safe_get_text(cells[1]),  # e.g., 'lecture' or 'practical'
                            "date": safe_get_text(cells[2]),  # e.g., 'Sat, 19/07/2025'
                            "status": status_text,  # e.g., 'Absence'
                        })
                        logger.debug(f"Added absence: {course_name} - {safe_get_text(cells[1])} on {safe_get_text(cells[2])}")
                    
    except Exception as e:
        logger.error(f"Error processing a course for absence: {e}", exc_info=True)
    
    logger.info(f"Absence extraction completed. Found {len(absences)} absence records.")
    return {"absences": absences}

def scrape_course_registration_data(driver):
    logger.info("Starting course registration data extraction...")
    results = {"registration_end_date": "", "available_courses": []}
    try:
        end_date_elem = wait_for_element(driver, By.ID, "lbl-reg-end-date", timeout=10)
        results["registration_end_date"] = safe_get_text(end_date_elem)
        course_articles = driver.find_elements(By.CSS_SELECTOR, "article.course-item")
        for article in course_articles:
            name = safe_get_text(safe_find_element(article, By.CSS_SELECTOR, "div.course-name"))
            if not name: continue
            results["available_courses"].append({
                "name": name,
                "hours": safe_get_text(safe_find_element(article, By.CSS_SELECTOR, "span.course-hours")),
                "fees": safe_get_text(safe_find_element(article, By.CSS_SELECTOR, "span.course-fees")),
                "group": safe_get_text(safe_find_element(article, By.CSS_SELECTOR, "div.course-group")),
            })
    except Exception as e: logger.error(f"Failed to scrape course registration page: {e}", exc_info=True)
    return results

# --- Main Execution Logic ---
def run_scrape_for_user(username: str, password: str, fcb_api_key: str, nopecha_api_key: str):
    logger.info(f"--- Starting scrape for user {username} ---")
    driver = None
    scraped_data = {"quizzes": {}, "assignments": {}, "absences": {}, "course_registration": {}}
    
    try:
        # Initialize driver with retry logic
        max_driver_attempts = 2
        for driver_attempt in range(max_driver_attempts):
            try:
                driver = initialize_driver(headless=True)
                break
            except Exception as e:
                logger.error(f"Driver initialization attempt {driver_attempt + 1} failed: {e}")
                if driver_attempt == max_driver_attempts - 1:
                    raise Exception(f"Failed to initialize driver after {max_driver_attempts} attempts")
                time.sleep(10)
        
        # Perform login with session validation
        login(driver, username, password, fcb_api_key, nopecha_api_key)
        
        # Validate session is still active
        try:
            current_url = driver.current_url
            logger.info(f"Session validated, current URL: {current_url}")
        except Exception as e:
            logger.error(f"Session validation failed: {e}")
            raise Exception("WebDriver session became invalid after login")

        page_map = {
            "quizzes": (QUIZZES_URL, (By.CSS_SELECTOR, "section.course-item"), scrape_quizzes),
            "assignments": (ASSIGNMENTS_URL, (By.CSS_SELECTOR, "section.course-item"), scrape_assignments),
            "absences": (ABSENCE_URL, (By.CSS_SELECTOR, "div.panel-group.course-grp"), scrape_absence_data),
            "course_registration": (COURSE_REG_URL, (By.ID, "courses-items"), scrape_course_registration_data)
        }
        
        for key, (url, wait_selector, scrape_func) in page_map.items():
            try:
                # Validate session before each page
                try:
                    driver.current_url  # Simple session check
                except Exception as session_error:
                    logger.error(f"Session invalid before scraping {key}: {session_error}")
                    raise Exception(f"WebDriver session became invalid before {key} scraping")
                
                logger.info(f"Starting {key} scraping...")
                if navigate_to_page(driver, url, wait_selector):
                    scraped_data[key] = scrape_func(driver)
                    logger.info(f"Successfully scraped {key}")
                else:
                    logger.warning(f"Failed to navigate to {key} page")
                    scraped_data[key] = {"error": f"Failed to load {key} page"}
                    
            except Exception as e:
                logger.error(f"Error scraping {key} for user {username}: {e}", exc_info=True)
                scraped_data[key] = {"error": f"An exception occurred during {key} scraping: {e}"}
                
                # Check if it's a session-related error
                if "invalid session id" in str(e).lower() or "session" in str(e).lower():
                    logger.error("Session-related error detected, aborting remaining scrapes")
                    break
        
        logger.info(f"Scrape completed for user {username}")
        return {"status": "success", "data": scraped_data}

    except Exception as e:
        logger.critical(f"A critical error occurred during main execution for user {username}: {e}", exc_info=True)
        return {"status": "failed", "error": str(e), "trace": traceback.format_exc()}
    finally:
        # Enhanced cleanup
        if driver:
            try:
                # Close all windows
                for handle in driver.window_handles:
                    driver.switch_to.window(handle)
                    driver.close()
            except Exception as cleanup_error:
                logger.warning(f"Error during window cleanup: {cleanup_error}")
            
            try:
                driver.quit()
                logger.info("Driver successfully quit")
            except Exception as quit_error:
                logger.warning(f"Error during driver quit: {quit_error}")
            
            # Force cleanup
            driver = None
            
        logger.info(f"--- Scraper finished for user {username} ---")