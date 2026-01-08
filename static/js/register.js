window.register = function () {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const messageEl = document.getElementById("message");
    if (!usernameInput || !passwordInput) {
        console.error("Username or password input missing.");
        return;
    }
    const username = usernameInput.value;
    const password = passwordInput.value;
    fetch("http://127.0.0.1:8000/api/register-user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
        .then(res => res.json())
        .then(() => {
        if (messageEl) {
            messageEl.textContent = "Registration successful!";
        }
        setTimeout(() => {
            window.location.href = "/api/login/";
        }, 1000);
    })
        .catch(() => {
        if (messageEl) {
            messageEl.textContent = "Error during registration.";
        }
    });
};
export {};
