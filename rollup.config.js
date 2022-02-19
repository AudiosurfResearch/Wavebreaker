'use strict';

import BrowserViewFactory from 'express-svelte/lib/browser-view-factory';

export default BrowserViewFactory.create('views/**/*.svelte', {
    relative: 'views/',
    outputDir: 'public/dist',
    // Only create legacy builds for production
    legacy: false
})