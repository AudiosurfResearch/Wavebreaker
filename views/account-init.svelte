<script>
    import Navbar from "./components/common/navbar.svelte";
    //import Choices from "choices.js";
    import { countryList } from "../utils";

    //const choices = new Choices(".dropdown");
</script>

<Navbar />

<div class="container">
    <div class="columns is-multiline is-centered">
        <div class="column is-one-fifth">
            <div class="field">
                <div class="control has-icons-left">
                    <input class="input" type="text" placeholder="Username" />
                    <span class="icon is-small is-left">
                        <i class="fas fa-user" />
                    </span>
                </div>
            </div>

            <div class="field">
                <p class="control has-icons-left">
                    <input
                        class="input"
                        type="password"
                        placeholder="Password"
                    />
                    <span class="icon is-small is-left">
                        <i class="fas fa-key" />
                    </span>
                </p>
            </div>

            <div class="field">
                <p class="control has-icons-left">
                    <input
                        class="input"
                        type="password"
                        placeholder="Confirm password"
                    />
                    <span class="icon is-small is-left">
                        <i class="fas fa-key" />
                    </span>
                </p>
            </div>

            <div class="field">
                <div class="control has-icons-left">
                    <div class="select">
                        <select>
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
            </div>

            <div class="field">
                <p class="control">
                    <button class="button is-primary"> Create account </button>
                </p>
            </div>
        </div>
    </div>
</div>
