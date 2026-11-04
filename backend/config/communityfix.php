<?php

[$lat, $lng] = array_map('floatval', explode(',', env('MAP_CENTER', '14.5995,120.9842')));

return [
    'map_center' => ['lat' => $lat, 'lng' => $lng],
];
