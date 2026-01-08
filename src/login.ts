interface TokenResponse {
    access?: string;
    refresh?: string;
}

interface JwtPayload {
    is_admin?: boolean;
}
declare global {
    interface Window {
        login: () => void;
    }
}


window.login = function (): void {
    const usernameInput = document.getElementById("username") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;

    if (!usernameInput || !passwordInput) {
        console.error("Username or password input not found.");
        return;
    }

    const username = usernameInput.value;
    const password = passwordInput.value;

    fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
        .then(res => res.json())
        .then((data: TokenResponse) => {
            if (data.access) {
                localStorage.setItem("access", data.access);
                localStorage.setItem("refresh", data.refresh ?? "");

                const isAdmin = getIsAdminFromToken();
                localStorage.setItem("is_admin", isAdmin.toString());

                window.location.href = "/api";
            } else {
                const messageElement = document.getElementById("message");
                if (messageElement) {
                    messageElement.textContent = "Invalid credentials.";
                }
            }
        })
        .catch(() => {
            const messageElement = document.getElementById("message");
            if (messageElement) {
                messageElement.textContent = "Login error.";
            }
        });
};

function getIsAdminFromToken(): boolean {
    const token = localStorage.getItem("access");
    if (!token) return false;

    try {
        const payloadStr = atob(token.split(".")[1]);
        const payload = JSON.parse(payloadStr) as JwtPayload;
        return payload.is_admin === true;
    } catch {
        console.error("Failed to decode JWT token.");
        return false;
    }
}
