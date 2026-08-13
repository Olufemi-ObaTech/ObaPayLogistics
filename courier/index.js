// Mock courier simulator: stands in for DHL / Aramex / Sendy / a geocoding
// provider during local development and CI, so the Logistics service's
// resilience code (retries, circuit breakers, rate-shopping) has something
// real to exercise instead of hand-rolled unit-test doubles.
const express = require('express');
const { v4: uuid } = require('uuid');

const app = express();
app.use(express.json());

// Simple structured request logging.
app.use((req, res, next) => {
  console.log(JSON.stringify({ msg: 'mock_courier_request', method: req.method, path: req.path }));
  next();
});

const PARTNER_PROFILES = {
  dhl: { baseFee: 15, perKg: 4.5, multiplier: 1.2, days: { AIR: 2, ROAD: 5, SEA: 20 }, currency: 'USD', failRate: 0.03 },
  aramex: { baseFee: 10, perKg: 3.5, multiplier: 1.0, days: { AIR: 3, ROAD: 4, SEA: 18 }, currency: 'USD', failRate: 0.05 },
  sendy: { baseFee: 5, perKg: 2.0, multiplier: 0.75, days: { AIR: 4, ROAD: 2, SEA: 25 }, currency: 'USD', failRate: 0.05 },
};

function computeRate(profile, order) {
  const volumetric = (order.dimensions.length * order.dimensions.width * order.dimensions.height) / 5000;
  const chargeableWeight = Math.max(order.weightKg, volumetric);
  const amount = Number(((profile.baseFee + chargeableWeight * profile.perKg) * profile.multiplier).toFixed(2));
  const estimatedDays = profile.days[order.shippingMethod] ?? 7;
  return { amount, currency: profile.currency, estimatedDays };
}

function maybeFail(profile, res) {
  if (Math.random() < profile.failRate) {
    res.status(503).json({ message: 'Simulated partner outage, please retry' });
    return true;
  }
  return false;
}

// In-memory tracking store: trackingNumber -> events[]
const trackingStore = new Map();

function registerPartnerRoutes(prefix, profile) {
  const router = express.Router();

  router.post('/rate', (req, res) => {
    if (maybeFail(profile, res)) return;
    res.json(computeRate(profile, req.body));
  });

  router.post('/shipments', (req, res) => {
    if (maybeFail(profile, res)) return;
    const trackingNumber = `${prefix.toUpperCase()}-${uuid().split('-')[0].toUpperCase()}`;
    const now = new Date().toISOString();
    trackingStore.set(trackingNumber, [
      { timestamp: now, location: req.body.origin?.city ?? 'origin', statusCode: 'PICKED_UP', description: `${prefix.toUpperCase()} collected the parcel` },
    ]);
    res.json({ trackingNumber, labelUrl: `https://mock-labels.local/${trackingNumber}.pdf` });
  });

  router.get('/tracking/:trackingNumber', (req, res) => {
    if (maybeFail(profile, res)) return;
    const events = trackingStore.get(req.params.trackingNumber) ?? [];
    // Append a new simulated event on each poll so the frontend timeline visibly progresses.
    const stages = ['IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const nextStage = stages[Math.min(events.length - 1, stages.length - 1)];
    events.push({
      timestamp: new Date().toISOString(),
      location: 'in-transit hub',
      statusCode: nextStage,
      description: `Parcel status: ${nextStage.replace('_', ' ').toLowerCase()}`,
    });
    trackingStore.set(req.params.trackingNumber, events);
    res.json({ events });
  });

  app.use(`/${prefix}`, router);
}

Object.entries(PARTNER_PROFILES).forEach(([prefix, profile]) => registerPartnerRoutes(prefix, profile));

// Geocoding stub: echoes back a normalized address with fake coordinates.
app.post('/geocode', (req, res) => {
  const { line1, city, country } = req.body;
  if (!line1 || !city || !country) {
    return res.status(400).json({ message: 'line1, city, and country are required' });
  }
  res.json({
    lat: Number((Math.random() * 60 - 30).toFixed(6)),
    lng: Number((Math.random() * 70).toFixed(6)),
    normalizedAddress: `${line1}, ${city}, ${country}`,
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Mock courier simulator listening on :${PORT}`));
