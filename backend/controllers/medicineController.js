import Medicine from '../models/Medicine.js';

/**
 * GET /api/medicines/search?q=para
 * Search medicines by name - returns autocomplete suggestions
 * Public within authenticated session - no tenant required
 */
export const searchMedicines = async (req, res) => {
  try {
    const { q = '' } = req.query;

    if (!q || q.trim().length < 1) {
      // Return top 20 most used medicines if no query
      const top = await Medicine.find({})
        .sort({ usageCount: -1 })
        .limit(20)
        .select('name usageCount');
      return res.json(top);
    }

    const query = q.trim().toLowerCase();

    // Search by prefix first (most relevant), then by contains
    const medicines = await Medicine.find({
      nameLower: { $regex: query, $options: 'i' }
    })
      .sort({ usageCount: -1, name: 1 })
      .limit(15)
      .select('name usageCount');

    return res.json(medicines);
  } catch (err) {
    console.error('[Medicine] Search error:', err);
    return res.status(500).json({ message: 'Failed to search medicines.' });
  }
};

/**
 * POST /api/medicines/bulk-save
 * Save multiple medicine names at once (called when a bill is saved)
 * Only saves the name — if exists, increments usageCount
 */
export const bulkSaveMedicines = async (req, res) => {
  try {
    const { names = [] } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ message: 'No medicine names provided.' });
    }

    // Clean & deduplicate
    const cleanNames = [...new Set(
      names
        .map(n => String(n || '').trim())
        .filter(n => n.length >= 2)
    )];

    if (cleanNames.length === 0) {
      return res.json({ saved: 0 });
    }

    // Upsert each medicine — increment usageCount if exists, insert if not
    const ops = cleanNames.map(name => ({
      updateOne: {
        filter: { nameLower: name.toLowerCase() },
        update: {
          $inc: { usageCount: 1 },
          $setOnInsert: { name, nameLower: name.toLowerCase() }
        },
        upsert: true
      }
    }));

    const result = await Medicine.bulkWrite(ops);
    console.log(`[Medicine] Saved/updated ${cleanNames.length} medicines. Upserted: ${result.upsertedCount}`);

    return res.json({
      saved: cleanNames.length,
      newEntries: result.upsertedCount
    });
  } catch (err) {
    console.error('[Medicine] Bulk save error:', err);
    return res.status(500).json({ message: 'Failed to save medicines.' });
  }
};

/**
 * Internal helper — saves medicine names without HTTP context
 * Called directly from billingController after bill creation
 */
export const saveMedicineNames = async (names = []) => {
  try {
    const cleanNames = [...new Set(
      names
        .map(n => String(n || '').trim())
        .filter(n => n.length >= 2)
    )];

    if (cleanNames.length === 0) return;

    const ops = cleanNames.map(name => ({
      updateOne: {
        filter: { nameLower: name.toLowerCase() },
        update: {
          $inc: { usageCount: 1 },
          $setOnInsert: { name, nameLower: name.toLowerCase() }
        },
        upsert: true
      }
    }));

    await Medicine.bulkWrite(ops);
    console.log(`[Medicine] Auto-saved ${cleanNames.length} medicine names from billing.`);
  } catch (err) {
    // Non-critical — log but don't break billing flow
    console.error('[Medicine] Auto-save failed (non-critical):', err.message);
  }
};
