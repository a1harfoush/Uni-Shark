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

class CaptchaApiKeysRequiredError(Exception):
    """Custom exception for when CAPTCHA is present but no valid API keys are provided"""
    pass


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
    
    # Core stability options optimized for DULMS
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--log-level=3")
    options.add_argument("--window-size=1280,720")  # Reduced window size for memory
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    # Memory optimization options for Heroku
    options.add_argument("--memory-pressure-off")
    options.add_argument("--max_old_space_size=256")  # Limit V8 heap to 256MB
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-backgrounding-occluded-windows")
    options.add_argument("--disable-features=TranslateUI")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-plugins")
    # options.add_argument("--disable-images")  # Disable image loading to save memory
    
    # Set page load strategy for better performance
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
    """Optimized robust clicking for DULMS with proven strategies"""
    if not element_or_locator:
        return False
    
    element = None
    
    try:
        # Handle both element and locator inputs
        if isinstance(element_or_locator, tuple):
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable(element_or_locator)
            )
        else:
            element = element_or_locator
            WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable(element)
            )

        # Strategy 1: Standard click with element_to_be_clickable wait
        element.click()
        logger.debug("Standard click successful")
        return True

    except (ElementClickInterceptedException, StaleElementReferenceException, TimeoutException) as e:
        logger.warning(f"Standard click failed for {element.tag_name if element else 'unknown'}: {e}. Trying JS click.")
        
        try:
            # Strategy 2: JavaScript click with scroll into view (optimized for DULMS)
            if isinstance(element_or_locator, tuple):
                element = driver.find_element(*element_or_locator)
            
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();", element)
            logger.debug("JavaScript click successful")
            return True
            
        except Exception as js_e:
            logger.error(f"JavaScript click also failed: {js_e}")
            return False
    
    except Exception as e:
        logger.error(f"An unexpected error occurred during click: {e}")
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

def handle_captcha_conditionally(driver, fcb_api_key, nopecha_api_key):
    """
    Enhanced CAPTCHA handling with conditional logic:
    1. Check if CAPTCHA exists
    2. If no CAPTCHA - continue without solving
    3. If CAPTCHA exists but no valid API keys - raise specific error for user suspension
    4. If CAPTCHA exists with valid API keys - solve and continue
    """
    logger.info("Checking for CAPTCHA presence...")
    
    # Check if CAPTCHA input field exists and is visible (quick check)
    captcha_input = None
    try:
        # Use a very short timeout since CAPTCHA is temporarily removed
        captcha_input = WebDriverWait(driver, 1).until(
            EC.presence_of_element_located((By.ID, "txt_captcha"))
        )
        # Double-check if it's actually visible
        if not captcha_input.is_displayed():
            logger.info("CAPTCHA input field exists but not visible - proceeding without CAPTCHA solving")
            return True
    except TimeoutException:
        logger.info("No CAPTCHA input field found - proceeding without CAPTCHA solving")
        return True  # No CAPTCHA present, continue
    
    if not captcha_input:
        logger.info("CAPTCHA input field not found - proceeding without CAPTCHA solving")
        return True
    
    logger.info("CAPTCHA input field detected - checking for CAPTCHA image...")
    
    # Check if CAPTCHA image is actually present
    captcha_image_present = False
    selectors = [
        "div.captach img",      # Original selector (with typo)
        "div.captcha img",      # Corrected selector
        ".captcha img",         # Alternative
        "img[src*='captcha']",  # Generic captcha image
        "#captcha img"          # ID-based selector
    ]
    
    for selector in selectors:
        try:
            # Use shorter timeout since CAPTCHA is temporarily removed
            captcha_img = WebDriverWait(driver, 0.5).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, selector))
            )
            if captcha_img and captcha_img.is_displayed():
                logger.info(f"CAPTCHA image found using selector: {selector}")
                captcha_image_present = True
                break
        except TimeoutException:
            continue
    
    if not captcha_image_present:
        logger.info("CAPTCHA input field exists but no CAPTCHA image found - proceeding without solving")
        return True
    
    logger.info("CAPTCHA image detected - validating API keys...")
    
    # CAPTCHA is present, validate API keys
    if not validate_captcha_services(fcb_api_key, nopecha_api_key):
        logger.error("CAPTCHA is present but no valid API keys provided")
        raise CaptchaApiKeysRequiredError(
            "CAPTCHA detected but no valid API keys provided. "
            "Please add your CAPTCHA solving API keys in settings to continue automated scraping."
        )
    
    logger.info("Valid CAPTCHA API keys found - proceeding with CAPTCHA solving...")
    
    # Solve CAPTCHA with retry logic
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
            
            logger.info("CAPTCHA solved and entered successfully")
            return True
            
        except Exception as captcha_error:
            logging.warning(f"CAPTCHA attempt {captcha_attempt + 1} failed: {captcha_error}")
            if captcha_attempt == 1:
                raise Exception(f"CAPTCHA solving failed after retries: {captcha_error}")
            time.sleep(2)
    
    return False


def get_captcha_image_base64(driver):
    """Optimized CAPTCHA image capture with multiple selector fallbacks."""
    logger.info("Capturing CAPTCHA image...")
    try:
        # Try multiple possible selectors for CAPTCHA image (optimized order)
        selectors = [
            "div.captach img",      # Original selector (with typo) - most common
            "div.captcha img",      # Corrected selector
            ".captcha img",         # Alternative
            "img[src*='captcha']",  # Generic captcha image
            "#captcha img"          # ID-based selector
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
        
        # Scroll into view and capture (optimized)
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
                # Debug: Log current page info
                current_url = driver.current_url
                page_title = driver.title
                logging.error(f"Login page failed to load. URL: {current_url}, Title: {page_title}")
                
                # Check if we're on a different page
                if "delta" in page_title.lower() or "portal" in page_title.lower():
                    logging.error("Detected DELTA-PORTAL page instead of login page")
                
                raise Exception(f"Login page did not load correctly. Current page: {page_title}")
            
            logging.info("✅ Username field found successfully")
            
            # Re-find elements to avoid stale references
            password_field = wait_for_element(driver, By.ID, "txtPass", timeout=10)
            
            if not password_field:
                logging.error("❌ Password field not found")
                # Log available form elements for debugging
                try:
                    form_inputs = driver.find_elements(By.TAG_NAME, "input")
                    logging.info(f"Available input elements: {[inp.get_attribute('id') for inp in form_inputs if inp.get_attribute('id')]}")
                except:
                    pass
                raise Exception("Password field not found")
            
            logging.info("✅ Password field found successfully")

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

            # Enhanced CAPTCHA handling with conditional logic
            logging.info("Starting CAPTCHA conditional handling...")
            captcha_handled = handle_captcha_conditionally(driver, fcb_api_key, nopecha_api_key)
            if not captcha_handled:
                raise Exception("CAPTCHA handling failed - check API keys and try again")
            logging.info("CAPTCHA handling completed successfully")
            
            logging.info("Submitting login form...")
            
            # Submit form with multiple strategies (improved order)
            form_submitted = False
            
            # Strategy 1: Click the specific submit button
            try:
                submit_button = wait_for_element(driver, By.ID, "Button1", timeout=5)
                if submit_button:
                    click_element_robustly(driver, submit_button)
                    logging.info("✅ Form submitted via Button1 click")
                    form_submitted = True
                else:
                    raise Exception("Button1 not found")
            except Exception as button_error:
                logging.warning(f"Button1 click failed: {button_error}")
            
            # Strategy 2: Generic submit button
            if not form_submitted:
                try:
                    submit_button = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
                    click_element_robustly(driver, submit_button)
                    logging.info("✅ Form submitted via generic submit button")
                    form_submitted = True
                except Exception as button_error:
                    logging.warning(f"Generic submit button failed: {button_error}")
            
            # Strategy 3: Enter key on password field
            if not form_submitted:
                try:
                    password_field.send_keys(Keys.ENTER)
                    logging.info("✅ Form submitted via Enter key")
                    form_submitted = True
                except Exception as enter_error:
                    logging.warning(f"Enter key submission failed: {enter_error}")
            
            # Strategy 4: JavaScript form submission
            if not form_submitted:
                try:
                    driver.execute_script("document.forms[0].submit();")
                    logging.info("✅ Form submitted via JavaScript")
                    form_submitted = True
                except Exception as js_error:
                    logging.warning(f"JavaScript submission failed: {js_error}")
            
            if not form_submitted:
                raise Exception("All form submission strategies failed")

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
                    # Check for error messages in the error div
                    try:
                        error_div = driver.find_element(By.CSS_SELECTOR, ".error")
                        error_text = error_div.text.strip()
                        if error_text:
                            logging.error(f"Login error detected: {error_text}")
                            raise Exception(f"Login error: {error_text}")
                    except:
                        pass
                    
                    # Check page source for error indicators
                    page_source = driver.page_source.lower()
                    if "invalid" in page_source or "incorrect" in page_source or "wrong" in page_source:
                        raise Exception("Invalid credentials detected")
                    elif "captcha" in page_source and "wrong" in page_source:
                        raise Exception("Wrong CAPTCHA detected")
                    else:
                        logging.error(f"Login timeout - still on login page. URL: {current_url}")
                        raise Exception("Login form submission timeout - page did not redirect")
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
    Optimized course panel expansion with proven DULMS strategies
    """
    try:
        # Find the panel collapse element
        panel = course_element.find_element(By.CSS_SELECTOR, ".panel-collapse")
        
        # Check if already expanded (has 'in' class)
        if "in" in panel.get_attribute("class"):
            logger.debug("Panel already expanded")
            return True
        
        # Find the toggle element using multiple selectors (optimized order)
        toggle_element = None
        selectors = [".accordion-toggle", "a[data-toggle='collapse']"]
        
        for selector in selectors:
            try:
                toggle_element = course_element.find_element(By.CSS_SELECTOR, selector)
                break
            except NoSuchElementException:
                continue
        
        if not toggle_element:
            logger.error("No toggle element found for panel expansion")
            return False
        
        # Use JavaScript click directly for better reliability with DULMS
        try:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'}); arguments[0].click();", toggle_element)
            
            # Wait for expansion - check for 'in' class
            WebDriverWait(driver, 5).until(
                lambda d: "in" in panel.get_attribute("class")
            )
            time.sleep(0.5)  # Small wait for content to load
            logger.debug("Panel expanded successfully")
            return True
            
        except TimeoutException:
            logger.warning("Panel expansion timeout - panel may not have expanded")
            return False
            
    except Exception as e:
        logger.error(f"Error expanding course panel: {e}")
        return False

# --- Optimized Generic Parsing Functions ---

def _parse_quiz_item(item_element, course_name):
    """Parses a single quiz item. Returns data and grade status."""
    quiz_data = {"course": course_name, "type": "Quiz"}
    
    # Extract quiz name
    quiz_data["name"] = safe_get_text(safe_find_element(item_element, By.CSS_SELECTOR, "a.quiz-name")) or "Unnamed Quiz"
    
    # Extract status/deadline
    raw_status = safe_get_text(safe_find_element(item_element, By.CSS_SELECTOR, ".quiz-status"))
    quiz_data["closed_at"] = raw_status.split("Closed at:")[-1].strip() if "Closed at:" in raw_status else raw_status
    
    # Check for grade
    grade_text = safe_get_text(safe_find_element(item_element, By.CSS_SELECTOR, ".graded-status"))
    quiz_data["grade"] = grade_text if grade_text and grade_text != "--" else "Not Graded"
    
    has_grade = quiz_data["grade"] != "Not Graded"
    return quiz_data, has_grade

def _parse_assignment_item(item_element, course_name):
    """Parses a single assignment item. Returns data."""
    assignment_data = {"course": course_name, "type": "Assignment"}
    
    # Extract assignment name
    assignment_data["name"] = safe_get_text(safe_find_element(item_element, By.CSS_SELECTOR, ".assign-name")) or "Unnamed Assignment"
    
    # Extract submit status
    assignment_data["submit_status"] = safe_get_text(safe_find_element(item_element, By.CSS_SELECTOR, ".submit-status")) or "Status Unknown"
    
    # Extract deadline
    raw_date = safe_get_text(safe_find_element(item_element, By.CSS_SELECTOR, ".assign-status"))
    assignment_data["closed_at"] = raw_date.split("Closed at:")[-1].strip() if "Closed at:" in raw_date else raw_date
    
    # Extract grading status
    assignment_data["grading_status"] = safe_get_text(safe_find_element(item_element, By.CSS_SELECTOR, ".graded-status")) or "Not Graded Yet"
    
    return assignment_data, None

def _scrape_accordion_page(driver, page_name, item_selector, item_parser_func):
    """Generic optimized function for scraping accordion-style pages (Quizzes/Assignments)."""
    logger.info(f"Starting {page_name} data extraction...")
    results = {
        "items_with_results": [],
        "items_without_results": [],
        "courses_processed": 0,
        "total_items_found": 0,
        "courses_found_on_page": [],
        "courses_with_no_items": [],
        "courses_failed_expansion": []
    }
    
    try:
        courses = driver.find_elements(By.CSS_SELECTOR, "section.course-item")
        logger.info(f"Found {len(courses)} course sections on the {page_name} page.")
        
        for course in courses:
            try:
                course_name = safe_get_text(safe_find_element(course, By.CSS_SELECTOR, "strong.course-name")) or "Unknown Course"
                results["courses_found_on_page"].append(course_name)
                
                if not expand_course_panel(driver, course):
                    results["courses_failed_expansion"].append(course_name)
                    continue
                
                results["courses_processed"] += 1
                
                items = course.find_elements(By.CSS_SELECTOR, item_selector)
                if not items:
                    results["courses_with_no_items"].append(course_name)
                    continue
                
                for item in items:
                    results["total_items_found"] += 1
                    parsed_data, has_grade = item_parser_func(item, course_name)
                    
                    if has_grade:
                        results["items_with_results"].append(parsed_data)
                    else:
                        results["items_without_results"].append(parsed_data)
                        
            except StaleElementReferenceException:
                logger.warning(f"Stale element on {page_name} page. Skipping a course section.")
                continue
                
    except Exception as e:
        logger.error(f"Major error during {page_name} extraction: {e}", exc_info=True)
    
    return results

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
    Optimized absence data scraping with 'Expand All' strategy from refactored code.
    """
    logger.info("Starting absence data extraction...")
    absences = []
    
    try:
        # First, try to click the "Expand All" button for efficiency
        try:
            expand_all_btn = wait_for_element(driver, By.CSS_SELECTOR, "span.c-p.more.exp-coll.pull-right.m-b-sm.m-r-lg", timeout=10)
            if expand_all_btn and expand_all_btn.is_displayed():
                logger.info("Clicking 'Expand All' button...")
                if click_element_robustly(driver, expand_all_btn):
                    # Wait for all courses to expand - wait for collapse elements to be visible
                    WebDriverWait(driver, 10).until(
                        lambda d: len(d.find_elements(By.CSS_SELECTOR, "div.panel-collapse.in")) > 0
                    )
                    time.sleep(2)  # Additional wait for full page load
                    logger.info("All courses expanded successfully.")
                else:
                    logger.warning("Failed to click 'Expand All' button, falling back to individual expansion.")
            else:
                logger.info("Expand All button not found or not visible.")
        except (TimeoutException, NoSuchElementException) as e:
            logger.info(f"Expand All button not found: {e}. Proceeding with individual course expansion.")
        
        # Now scrape data from all course containers
        course_containers = driver.find_elements(By.CSS_SELECTOR, "div.panel-group.course-grp")
        logger.info(f"Found {len(course_containers)} course sections on the absence page.")
        
        for course in course_containers:
            try:
                course_name = safe_get_text(safe_find_element(course, By.CSS_SELECTOR, "a.accordion-toggle span")) or "Unknown"
                
                # Check if course is already expanded (has "in" class in panel-collapse)
                panel_collapse = safe_find_element(course, By.CSS_SELECTOR, ".panel-collapse")
                if panel_collapse and "in" not in panel_collapse.get_attribute("class"):
                    # Course not expanded, try to expand it individually
                    if not expand_course_panel(driver, course):
                        logger.warning(f"Could not expand course: {course_name}")
                        continue
                
                # Scrape absence data from this course
                absence_rows = course.find_elements(By.XPATH, ".//tr[td[contains(., 'Absence')]]")
                logger.info(f"Found {len(absence_rows)} absence records in course: {course_name}")
                
                for row in absence_rows:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 4:
                        absences.append({
                            "course": course_name,
                            "type": safe_get_text(cells[1]),
                            "date": safe_get_text(cells[2]),
                            "status": safe_get_text(cells[3]),
                        })
                        
            except StaleElementReferenceException:
                logger.warning("Stale element encountered, skipping course.")
                continue
            except Exception as e:
                logger.error(f"Error processing course {course_name}: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Error scraping absence data: {e}", exc_info=True)
    
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
# --- Optimized Date Parsing & Alerting Functions ---

def parse_date(date_str):
    """Enhanced date parsing with multiple format support and relative date handling."""
    if not date_str or any(s in date_str for s in ["N/A", "Unknown"]): 
        return None
        
    date_str = date_str.replace('\n', ' ').strip()
    
    # Handle relative dates like "Will be closed after: 5 days 12 hours"
    relative_match = re.search(r"Will be closed after:.*?(\d+)\s*days?.*?(\d+)\s*hours?", date_str, re.IGNORECASE)
    if relative_match:
        try:
            return datetime.now() + timedelta(days=int(relative_match.group(1)), hours=int(relative_match.group(2)))
        except (ValueError, IndexError): 
            pass
    
    # Try multiple date formats
    formats_to_try = [
        "%b %d, %Y at %I:%M %p", 
        "%B %d, %Y at %I:%M %p", 
        "%d/%m/%Y %I:%M %p"
    ]
    
    for fmt in formats_to_try:
        try: 
            return datetime.strptime(date_str, fmt)
        except ValueError: 
            continue
            
    logger.warning(f"Could not parse date: {date_str}")
    return None

def send_discord_alert(webhook_url, content=None, embeds=None):
    """Send Discord webhook alert with error handling."""
    if not webhook_url or "discord.com" not in webhook_url: 
        return
        
    try:
        response = requests.post(
            webhook_url, 
            json={"content": content, "embeds": embeds or []}, 
            timeout=15
        )
        response.raise_for_status()
        logger.info("Discord alert sent successfully.")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send Discord alert: {e}")

def send_deadline_alerts(data, webhook_url, deadline_threshold_days=7):
    """Send alerts for upcoming deadlines with optimized logic."""
    upcoming = []
    now = datetime.now()
    
    # Combine all tasks from different sources
    all_tasks = (
        data.get("assignments", {}).get("assignments", []) + 
        data.get("quizzes", {}).get("quizzes_without_results", [])
    )
    
    for task in all_tasks:
        deadline = parse_date(task.get("closed_at"))
        if deadline and deadline > now and (deadline - now).days <= deadline_threshold_days:
            upcoming.append({
                "course": task.get("course"), 
                "name": task.get("name"), 
                "due_date_obj": deadline, 
                "type": task.get("type")
            })
    
    if not upcoming: 
        return
        
    # Sort by deadline
    upcoming.sort(key=lambda x: x["due_date_obj"])
    
    # Create Discord embeds
    embeds = [{
        "title": f"🔔 {t['type']}: {t.get('name', 'Unnamed')}", 
        "color": 15158332, 
        "fields": [
            {"name": "Course", "value": t.get('course', 'N/A'), "inline": True}, 
            {"name": "Due Date", "value": t['due_date_obj'].strftime('%a, %b %d at %I:%M %p'), "inline": True}
        ]
    } for t in upcoming[:10]]
    
    send_discord_alert(webhook_url, content="**❗ Upcoming Deadlines Alert!**", embeds=embeds)

def check_and_send_new_absence_alerts(old_absences, new_absences, webhook_url):
    """Check for new absences and send alerts."""
    if not new_absences: 
        return 0
        
    old_set = {(a['course'], a['date'], a['type']) for a in old_absences}
    newly_recorded = [a for a in new_absences if (a['course'], a['date'], a['type']) not in old_set]
    
    if not newly_recorded:
        logger.info("No new absences detected.")
        return 0
        
    logger.info(f"Found {len(newly_recorded)} new absence records.")
    
    embeds = [{
        "title": f"⚠️ Absence: {a.get('course', 'N/A')}", 
        "color": 16729420, 
        "fields": [
            {"name": "Type", "value": a.get('type', 'N/A'), "inline": True}, 
            {"name": "Date", "value": a.get('date', 'N/A'), "inline": True}
        ]
    } for a in newly_recorded[:10]]
    
    send_discord_alert(webhook_url, content="**⚠️ New Absence(s) Recorded!**", embeds=embeds)
    return len(newly_recorded)

def check_and_send_new_course_alerts(old_data, new_data, webhook_url):
    """Check for new courses and send alerts."""
    if not new_data.get("available_courses"): 
        return 0
        
    old_names = {c.get("name") for c in old_data.get("available_courses", [])}
    newly_added = [c for c in new_data["available_courses"] if c.get("name") not in old_names]
    
    if not newly_added:
        logger.info("No new courses detected.")
        return 0
        
    logger.info(f"Found {len(newly_added)} new courses.")
    
    embeds = [{
        "title": f"🚀 New Course: {c.get('name', 'N/A')}", 
        "color": 3066993, 
        "fields": [
            {"name": "Hours", "value": c.get('hours', 'N/A'), "inline": True}, 
            {"name": "Fees", "value": c.get('fees', 'N/A'), "inline": True}
        ]
    } for c in newly_added[:10]]
    
    end_date = f"Registration Ends: **{new_data.get('registration_end_date', 'N/A')}**"
    send_discord_alert(webhook_url, content=f"**✅ New Courses for Registration!**\n{end_date}", embeds=embeds)
    return len(newly_added)