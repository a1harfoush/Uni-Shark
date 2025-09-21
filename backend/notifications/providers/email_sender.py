# /backend/notifications/providers/email_sender.py
import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import logging

BREVO_API_KEY = os.getenv("BREVO_API_KEY")

def send_email(recipient_email: str, recipient_name: str, subject: str, html_content: str):
    if not BREVO_API_KEY:
        logging.error("BREVO_API_KEY is not set.")
        return

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

    # Define the sender and recipient
    sender = {"name": "UniShark Alerts", "email": "alerts@unishark.site"}
    to = [{"email": recipient_email, "name": recipient_name}]

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=to,
        sender=sender,
        subject=subject,
        html_content=html_content
    )

    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        logging.info(f"Email sent to {recipient_email}. Response: {api_response}")
    except ApiException as e:
        logging.error(f"Exception when calling Brevo TransactionalEmailsApi->send_transac_email: {e}")