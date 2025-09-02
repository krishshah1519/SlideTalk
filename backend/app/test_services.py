import pytest
from .services import extract_base64_image

def test_extract_base64_image_valid():
    data_url = 'data:image/png;base64,SGVsbG8sV29ybGQh=='
    result = extract_base64_image(data_url)
    assert result == 'SGVsbG8sV29ybGQh=='

def test_extract_base64_image_invalid():
    data_url = 'not_a_data_url'
    result = extract_base64_image(data_url)
    assert result == ''

def test_extract_base64_image_empty():
    data_url = ''
    result = extract_base64_image(data_url)
    assert result == ''
