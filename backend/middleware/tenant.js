import Organization from '../models/Organization.js';

/**
 * Tenant Detection Middleware
 * Detects tenant from:
 * 1. Subdomain (clinicname.myapp.com)
 * 2. X-Tenant-ID header
 * 3. Query parameter ?tenant=slug
 * 4. User's organizationId (from JWT token)
 */
export const detectTenant = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenantSlug = null;

    // Method 1: Extract from subdomain (supports API host, Origin, and Referer)
    const host = req.get('host') || '';
    const origin = req.get('origin') || '';
    const referer = req.get('referer') || '';
    
    // Determine the source domain to extract the subdomain from
    let sourceUrl = '';
    if (origin) {
      sourceUrl = origin.replace(/^https?:\/\//, '');
    } else if (referer) {
      sourceUrl = referer.replace(/^https?:\/\//, '').split('/')[0];
    } else {
      sourceUrl = host;
    }

    const subdomain = sourceUrl.split('.')[0];
    
    // Skip 'www' and common subdomains
    if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app' && subdomain !== 'localhost' && subdomain !== '127') {
      const org = await Organization.findOne({ subdomain: subdomain });
      if (org) {
        tenantId = org._id;
        tenantSlug = org.slug;
      }
    }

    // Method 2: Check X-Tenant-ID header
    if (!tenantId && req.headers['x-tenant-id']) {
      const tenantHeader = req.headers['x-tenant-id'];
      // Check if it's a valid MongoDB ObjectId or a slug
      if (tenantHeader.match(/^[0-9a-fA-F]{24}$/)) {
        // It's an ObjectId, use directly
        tenantId = tenantHeader;
      } else {
        // It's a slug, look up the organization
        const org = await Organization.findOne({ slug: tenantHeader });
        if (org) {
          tenantId = org._id;
          tenantSlug = org.slug;
        }
      }
    }

    // Method 3: Check query parameter
    if (!tenantId && req.query.tenant) {
      const org = await Organization.findOne({ slug: req.query.tenant });
      if (org) {
        tenantId = org._id;
        tenantSlug = org.slug;
      }
    }

    // Method 4: Use user's organizationId (if authenticated)
    if (!tenantId && req.user && req.user.organizationId) {
      tenantId = req.user.organizationId;
    }

    // Store tenant info in request
    req.tenantId = tenantId;
    req.tenantSlug = tenantSlug;

    // For superadmin, tenantId can be null
    if (req.user && req.user.role === 'superadmin') {
      // Superadmin can access all tenants or no tenant
      return next();
    }

    // For organization routes, tenantId is required (except superadmin)
    if (!tenantId && req.path.startsWith('/api/organizations')) {
      // Allow organization creation without tenant
      if (req.method === 'POST' && req.path === '/api/organizations') {
        return next();
      }
    }

    next();
  } catch (error) {
    console.error('Tenant detection error:', error);
    res.status(500).json({ message: 'Error detecting tenant', error: error.message });
  }
};

/**
 * Require Tenant Middleware
 * Ensures tenant is detected before proceeding
 */
export const requireTenant = (req, res, next) => {
  // Superadmin can bypass tenant requirement
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }

  if (!req.tenantId) {
    return res.status(400).json({ 
      message: 'Tenant not detected. Please provide tenant information via subdomain, header, or query parameter.' 
    });
  }

  next();
};

/**
 * Load Tenant Organization Middleware
 * Loads full organization document into req.organization
 */
export const loadTenant = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      return next();
    }

    const organization = await Organization.findById(req.tenantId)
      .populate('ownerId', 'name email')
      .populate('subscriptionId');

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if organization is active
    if (organization.status === 'suspended') {
      return res.status(403).json({ message: 'Organization account is suspended' });
    }

    req.organization = organization;
    next();
  } catch (error) {
    console.error('Load tenant error:', error);
    res.status(500).json({ message: 'Error loading tenant', error: error.message });
  }
};
