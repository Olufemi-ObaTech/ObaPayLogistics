<?php

use Illuminate\Support\Facades\Route;

// This service is an API-only backend — there's no web UI here. The bare
// default Laravel welcome page was confusing when browsed to directly, so
// point visitors at the actual API surface instead.
Route::get('/', function () {
    return response()->json([
        'service' => 'ObaPay API',
        'status' => 'running',
        'note' => 'This is an API-only backend. See /api/* for endpoints, or /up for a health check.',
    ]);
});
