<?php

[$lat, $lng] = array_map('floatval', explode(',', env('MAP_CENTER', '14.5995,120.9842')));

return [
    'frontend_url' => rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/'),
    'internal_key' => env('INTERNAL_API_KEY'),
    'map_center' => ['lat' => $lat, 'lng' => $lng],
];
