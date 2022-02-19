<style global lang="scss">
    @import "../../../global.scss";
</style>

<script>
    import { getContext } from 'svelte';
    const { user } = getContext('global.stores');
</script>

<nav class="navbar is-fixed-top" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
        <a class="navbar-item" href="/">
            <!--
            <img
                src="https://bulma.io/images/bulma-logo.png"
                width="112"
                height="28"
                alt="Wavebreaker logo"
            />
            -->
            <strong>Wavebreaker</strong>
        </a>

        <a
            role="button"
            class="navbar-burger"
            aria-label="menu"
            aria-expanded="false"
            data-target="navbarBasicExample"
        >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
        </a>
    </div>

    <div id="navbarBasicExample" class="navbar-menu">
        <div class="navbar-end">
            {#if $user}
            <div class="navbar-item has-dropdown is-hoverable">
                <a class="navbar-link">
                    <figure class="image">
                        <img class="is-rounded" src={$user._json.avatarfull} alt="User profile picture" width="64" height="64">
                    </figure>
                    <span>&nbsp;&nbsp;&nbsp;{$user.displayName}</span>
                </a>

                <!--
                <div class="is-flex is-justify-content-center">
                    <figure class="image is-128x128 is-inline-block">
                        <img class="is-rounded" src="https://bulma.io/images/placeholders/128x128.png">
                    </figure>
                </div>
                -->

                <div class="navbar-dropdown">
                    <a class="navbar-item">it's</a>
                    <a class="navbar-item">cool</a>
                    <a class="navbar-item">yeah</a>
                    <hr class="navbar-divider" />
                    <a href="/api/auth/logout" class="navbar-item"> Log out </a>
                </div>
            </div>
            {:else}
            <div class="navbar-item">
                <div class="buttons">
                    <a href="/api/auth/steam" class="button is-primary">
                        <span class="icon">
                            <i class="fab fa-steam"></i>
                        </span>
                        <span>Log in with Steam</span>
                    </a>
                </div>
            </div>
            {/if}
        </div>
    </div>
</nav>