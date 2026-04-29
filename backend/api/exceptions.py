from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging
import traceback

logger = logging.getLogger('django')

def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django Rest Framework.
    Provides descriptive error messages and standardized response format.
    """
    # Call DRF's default exception handler first to get the standard error response.
    response = exception_handler(exc, context)

    # If an unexpected exception occurs (one not handled by DRF)
    if response is None:
        # Log the full traceback for debugging
        logger.error(f"Unhandled Exception: {str(exc)}")
        logger.error(traceback.format_exc())

        # Create a descriptive error response for server errors
        message = "A server error occurred. Please try again later."
        
        # Handle specific common runtime errors with better descriptions
        if isinstance(exc, AttributeError):
            message = f"Attribute Error: {str(exc)}"
        elif isinstance(exc, KeyError):
            message = f"Missing required data key: {str(exc)}"
        elif hasattr(exc, 'message'):
            message = exc.message
        elif hasattr(exc, 'detail'):
            message = exc.detail
            
        return Response(
            {
                'error': True,
                'message': message,
                'detail': str(exc) if hasattr(exc, '__str__') else None
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Customize the standard DRF response format
    if response is not None:
        custom_data = {
            'error': True,
            'message': 'Request failed',
            'errors': response.data
        }

        # If it's a validation error, provide a clearer message
        if response.status_code == 400:
            custom_data['message'] = 'Validation Error'
        elif response.status_code == 401:
            custom_data['message'] = 'Authentication Credentials not provided or invalid'
        elif response.status_code == 403:
            custom_data['message'] = 'You do not have permission to perform this action'
        elif response.status_code == 404:
            custom_data['message'] = 'Resource not found'

        response.data = custom_data

    return response
