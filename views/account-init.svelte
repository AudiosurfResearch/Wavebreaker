<script>
    import Navbar from "./components/common/navbar.svelte";
    import { countryList } from "../utils";

    import { form, field } from "svelte-forms";
    import { required, matchField, min, max } from "svelte-forms/validators";

    function checkUsername() {
        return async (value) => {
            const user = await fetch("/api/users/getUserByUsername", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username: value }),
            }).then((r) => r.json());

            return {
                valid: !(user.username === value),
                name: "already_taken",
            };
        };
    }

    const username = field("username", "", [
        required(),
        max(20),
        checkUsername(),
    ]);
    const password = field("password", "", [required(), min(8)]);
    const passwordConfirmation = field("passwordConfirmation", "", [
        matchField(password),
    ]);
    const locationID = field("locationID", "0", [min(1)]);
    const initForm = form(username, password, passwordConfirmation, locationID);

    async function initializeAccount() {
        const user = await fetch("/api/users/initializeAccount", {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: $username.value,
                password: $password.value,
                locationid: $locationID.value,
            }),
        })
            .then((r) => r.json())
            .then(function (response) {
                if (response.success) {
                    alert("Account created successfully! You can now log in from Audiosurf.")
                    window.location.href = "/";
                }
                else {
                    alert(response.message);
                }
            });
    }
</script>

<Navbar />

<div class="container">
    <div class="columns is-multiline is-centered">
        <div class="column is-one-fifth">
            <div class="field">
                <div class="control has-icons-left">
                    <input
                        class="input"
                        class:is-danger={$initForm.hasError(
                            "username.required"
                        ) ||
                            $initForm.hasError("username.max") ||
                            $initForm.hasError("username.already_taken")}
                        type="text"
                        placeholder="Username"
                        bind:value={$username.value}
                    />
                    <span class="icon is-small is-left">
                        <i class="fas fa-user" />
                    </span>
                </div>
                {#if $initForm.hasError("username.required")}
                    <p class="help is-danger">Username is required</p>
                {/if}
                {#if $initForm.hasError("username.max")}
                    <p class="help is-danger">
                        Username can't be longer than 20 characters
                    </p>
                {/if}
                {#if $initForm.hasError("username.already_taken")}
                    <p class="help is-danger">Username is already taken</p>
                {/if}
            </div>

            <div class="field">
                <p class="control has-icons-left">
                    <input
                        class="input"
                        class:is-danger={$initForm.hasError(
                            "password.required"
                        ) || $initForm.hasError("password.min")}
                        type="password"
                        placeholder="Game password"
                        bind:value={$password.value}
                    />
                    <span class="icon is-small is-left">
                        <i class="fas fa-key" />
                    </span>
                </p>
                {#if $initForm.hasError("password.required")}
                    <p class="help is-danger">Password is required</p>
                {/if}
                {#if $initForm.hasError("password.min")}
                    <p class="help is-danger">
                        Password needs to be at least 8 characters long
                    </p>
                {/if}
            </div>

            <div class="field">
                <p class="control has-icons-left">
                    <input
                        class="input"
                        class:is-danger={$initForm.hasError(
                            "passwordConfirmation.match_field"
                        )}
                        type="password"
                        placeholder="Confirm game password"
                        bind:value={$passwordConfirmation.value}
                    />
                    <span class="icon is-small is-left">
                        <i class="fas fa-key" />
                    </span>
                </p>
                {#if $initForm.hasError("passwordConfirmation.match_field")}
                    <p class="help is-danger">Passwords don't match</p>
                {/if}
            </div>

            <div class="field">
                <div class="control has-icons-left">
                    <div
                        class="select"
                        class:is-danger={$initForm.hasError("locationID.min")}
                    >
                        <select bind:value={$locationID.value}>
                            <option selected value="0">
                                Choose location...
                            </option>
                            {#each countryList as country, i}
                                <option value={i + 1}>{country}</option>
                            {/each}
                        </select>
                    </div>
                    <span class="icon is-left">
                        <i class="fas fa-globe" />
                    </span>
                </div>
                {#if $initForm.hasError("locationID.min")}
                    <p class="help is-danger">Please choose a location</p>
                {/if}
            </div>

            <div class="field">
                <p class="control">
                    <button
                        class="button is-primary"
                        disabled={!$initForm.valid}
                        on:click={initializeAccount}
                    >
                        Initialize account
                    </button>
                </p>
            </div>
        </div>
    </div>
</div>
