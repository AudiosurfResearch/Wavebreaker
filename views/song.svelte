<script>
    import Navbar from "./components/common/navbar.svelte";

    import { getContext } from "svelte";
    const { song, league } = getContext("global.stores");
    import dayjs from "dayjs";
    import relativeTime from "dayjs/plugin/relativeTime";
    dayjs.extend(relativeTime);
    import _ from "lodash";

    function msToMMSS(ms) {
        var minutes = Math.floor(ms / 60000);
        var seconds = ((ms % 60000) / 1000).toFixed(0);
        //ES6 interpolated literals/template literals
        //If seconds is less than 10 put a zero in front.
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }

    function idToCharacter(id) {
        const characters = [
            "Pointman Pro",
            "Double Vision Pro",
            "Vegas",
            "Pusher",
            "Eraser",
            "???",
            "???",
            "???",
            "???",
            "Double Vision",
            "Pointman Elite",
            "Mono Pro",
            "Eraser Elite",
            "Ninja Mono",
            "Double Vision Elite",
            "Pointman",
            "Pusher Elite",
            "Mono",
        ];
        return characters[id];
    }

    var leagueid = 0;
</script>

<Navbar />

<div class="box mx-6">
    <figure class="media">
        {#if $song.spotifyid}
            <p class="media-left image is-128x128">
                <img src={$song.coverurl} alt="Song cover" />
            </p>
        {/if}

        <div class="media-content">
            <div class="content">
                <p>
                    {#if $song.spotifyid}
                        <strong>{$song.fullSpotifyTitle}</strong>
                        (alt: {$song.artist} - {$song.title})
                    {:else}
                        <strong>{$song.artist} - {$song.title}</strong>
                    {/if}

                    <br />
                    Submitted scores: {$song.Scores.length}
                    <br />
                </p>
            </div>
        </div>
    </figure>
</div>

<div class="box mx-6">
    <div class="tabs is-boxed">
        <ul>
            <li class:is-active={leagueid === 0}>
                <a on:click={() => (leagueid = 0)}>
                    <span>Casual</span>
                </a>
            </li>
            <li class:is-active={leagueid === 1}>
                <a on:click={() => (leagueid = 1)}>
                    <span>Pro</span>
                </a>
            </li>
            <li class:is-active={leagueid === 2}>
                <a on:click={() => (leagueid = 2)}>
                    <span>Elite</span>
                </a>
            </li>
        </ul>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th />
                <td>User</td>
                <td>Score</td>
                <td>Character</td>
                <td>Feats</td>
                <td>Duration</td>
                <td>Time Set</td>
            </tr>
        </thead>
        <tbody>
            {#each _.orderBy($song.Scores, (i) => i.score, "desc") as score, i}
                {#if score.leagueid === leagueid}
                    <tr>
                        <th><strong>{i + 1}</strong></th>
                        <td>
                            <a href="/user/{score.User.id}">
                                {score.User.username}
                            </a>
                        </td>
                        <td>{score.score}</td>
                        <td>{idToCharacter(score.vehicleid)}</td>
                        <td>{score.feats}</td>
                        <td>{msToMMSS(score.songlength * 10)}</td>
                        <td>{dayjs(score.createdAt).fromNow()}</td>
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
</div>
