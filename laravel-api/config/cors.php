<?php

return [

    'paths' => ['api/*', 'up'],

    'allowed_methods' => ['*'],

    // This API is credentialed (bearer tokens); a wildcard origin combined with
    // a browser client would let any site read authenticated responses. No
    // wildcard fallback — CORS_ORIGIN must be set explicitly.
    'allowed_origins' => array_filter(explode(',', env('CORS_ORIGIN', 'http://localhost:3001'))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
