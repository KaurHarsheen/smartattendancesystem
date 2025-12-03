import requests
import sys

BASE_URL = "http://localhost:8000"

def check_endpoint():
    # 1. Login
    print("Logging in...")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": "admin1@gmail.com", "password": "123", "scope": "ADMIN"},
        )
        response.raise_for_status()
        token = response.json()["access_token"]
        print("Login successful.")
    except Exception as e:
        print(f"Login failed: {e}")
        # Try without scope if that fails (though code suggests scope is optional but handled)
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                data={"username": "admin1@gmail.com", "password": "123"},
            )
            response.raise_for_status()
            token = response.json()["access_token"]
            print("Login successful (no scope).")
        except Exception as e2:
            print(f"Login failed again: {e2}")
            sys.exit(1)

    # 2. Check Model Info
    print("Checking /faces/model-info...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/faces/model-info", headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            print("Endpoint verified successfully.")
        else:
            print("Endpoint failed.")
            sys.exit(1)
    except Exception as e:
        print(f"Request failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_endpoint()
