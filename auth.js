
"use strict";

// 1. Connect to Supabase

const SUPABASE_URL = "https://dgkrdvnhaztowloxukoz.supabase.co";

// Replace this placeholder with your Supabase publishable key
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_l6uH5M6c43ivQauDvE1dxA_e3cqX6It";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// 2. Find the HTML elements

const loginTab = document.getElementById("login-tab");
const signupTab = document.getElementById("signup-tab");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const submitButton = document.getElementById("auth-submit");
const messageElement = document.getElementById("auth-message");

let authMode = "login";

// 3. Switch between Login and Sign up

function setAuthMode(mode) {
    authMode = mode;

    loginTab.classList.toggle("active", mode === "login");
    signupTab.classList.toggle("active", mode === "signup");

    submitButton.textContent =
        mode === "login" ? "Login" : "Create account";

    messageElement.textContent = "";
}

loginTab.addEventListener("click", function () {
    setAuthMode("login");
});

signupTab.addEventListener("click", function () {
    setAuthMode("signup");
});

// 4. Handle form submission

authForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    messageElement.textContent = "";
    submitButton.disabled = true;

    try {
        let result;

        if (authMode === "signup") {
            result = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin + "/SpendWise/auth.html"
                }
            });
        } else {
            result = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
        }

        if (result.error) {
            throw result.error;
        }

        if (authMode === "signup" && !result.data.session) {
            messageElement.textContent =
                "Account created! Check your email to confirm your account, then log in.";
            return;
        }

        messageElement.textContent = "Login successful! Opening SpendWise...";

        window.location.href = "index.html";

    } catch (error) {
        messageElement.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});
