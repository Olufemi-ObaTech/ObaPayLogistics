<?php

return [

    'jwt_refresh_ttl_days' => (int) env('JWT_REFRESH_TTL_DAYS', 7),

    'merchant_settlement_fee_pct' => (float) env('MERCHANT_SETTLEMENT_FEE_PCT', 1.5),
    'fx_spread_pct' => (float) env('FX_SPREAD_PCT', 0.5),
    'logistics_margin_pct' => (float) env('LOGISTICS_MARGIN_PCT', 8),

    'customs_auto_clear_min_delay_ms' => (int) env('CUSTOMS_AUTO_CLEAR_MIN_DELAY_MS', 60000),
    'customs_auto_clear_max_delay_ms' => (int) env('CUSTOMS_AUTO_CLEAR_MAX_DELAY_MS', 300000),

    'document_storage_base_url' => env('DOCUMENT_STORAGE_BASE_URL', 'https://storage.obapay.com/'),

    'courier' => [
        'dhl' => ['base' => env('DHL_API_BASE', 'http://localhost:4001/dhl'), 'key' => env('DHL_API_KEY', 'stub-dhl-key')],
        'aramex' => ['base' => env('ARAMEX_API_BASE', 'http://localhost:4001/aramex'), 'key' => env('ARAMEX_API_KEY', 'stub-aramex-key')],
        'sendy' => ['base' => env('SENDY_API_BASE', 'http://localhost:4001/sendy'), 'key' => env('SENDY_API_KEY', 'stub-sendy-key')],
    ],

    'geocoding_api_base' => env('GEOCODING_API_BASE', 'http://localhost:4001/geocode'),
];
