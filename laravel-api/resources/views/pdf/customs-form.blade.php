<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1a1a1a; }
    h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
    .meta { font-size: 9px; text-align: center; color: #555; margin-bottom: 16px; }
    h2 { font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-top: 16px; }
    .row { margin: 2px 0; }
    .footer { margin-top: 20px; font-size: 8px; color: #777; }
</style>
</head>
<body>
    <h1>ObaPay Logistics &mdash; Customs Declaration</h1>
    <div class="meta">
        Tracking Number: {{ $shipment->tracking_number }} &nbsp;|&nbsp;
        Declaration Date: {{ now()->format('Y-m-d') }}
    </div>

    <h2>Shipper</h2>
    <div class="row">{{ $shipment->user->first_name }} {{ $shipment->user->last_name }}</div>
    <div class="row">{{ $origin['line1'] ?? '' }}, {{ $origin['city'] ?? '' }}, {{ $origin['country'] ?? '' }}</div>

    <h2>Consignee</h2>
    <div class="row">{{ $destination['line1'] ?? '' }}, {{ $destination['city'] ?? '' }}, {{ $destination['country'] ?? '' }}</div>

    <h2>Item Declaration</h2>
    <div class="row">Customs Category: {{ $shipment->customs_category }}</div>
    <div class="row">Harmonized System (HS) Code: {{ $hsCode }}</div>
    <div class="row">Declared Value: {{ $shipment->declared_value }} {{ $shipment->declared_value_currency }}</div>
    <div class="row">Weight: {{ $shipment->weight_kg }} kg</div>
    <div class="row">Dimensions: {{ $dims['length'] ?? '' }} x {{ $dims['width'] ?? '' }} x {{ $dims['height'] ?? '' }} cm</div>
    <div class="row">Shipping Method: {{ $shipment->shipping_method }}</div>

    <h2>Supporting Documents</h2>
    @forelse ($shipment->customsDocuments as $document)
        <div class="row">- {{ $document->document_type }}: {{ $document->verification_status }}</div>
    @empty
        <div class="row">None uploaded yet.</div>
    @endforelse

    <div class="footer">
        This declaration is generated for pre-clearance purposes under the AfCFTA simplified trade regime.
        Final clearance is subject to destination-country customs authority review via their electronic single-window system.
    </div>
</body>
</html>
