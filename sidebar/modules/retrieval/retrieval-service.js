/**
 * DS-160 Retrieval Service
 * Manages stored DS-160 application credentials with expiration tracking
 */

class DS160RetrievalService {
  constructor() {
    this.storageKey = 'ds160_retrieval_applications';
    this.applications = [];
  }

  /**
   * Initialize service and load applications from storage
   */
  async init() {
    await this.loadApplications();
    return this;
  }

  /**
   * Load applications from chrome storage
   */
  async loadApplications() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        this.applications = result[this.storageKey] || [];
        console.log(`Loaded ${this.applications.length} retrieval applications`);
        resolve(this.applications);
      });
    });
  }

  /**
   * Save applications to chrome storage
   */
  async saveApplications() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: this.applications }, () => {
        console.log(`Saved ${this.applications.length} retrieval applications`);
        resolve();
      });
    });
  }

  /**
   * Add new application
   * @param {Object} application - Application data
   * @param {string} application.applicationId - DS-160 application ID
   * @param {string} application.surname - Applicant's surname
   * @param {string} application.yearOfBirth - Year of birth
   * @param {string} application.motherMotherName - Mother's mother's given name
   * @param {string} [application.notes] - Optional notes
   */
  async addApplication(application) {
    // Validate required fields
    if (!application.applicationId || !application.surname ||
        !application.yearOfBirth || !application.motherMotherName) {
      throw new Error('Missing required fields');
    }

    // Check for duplicate application ID
    const exists = this.applications.find(app => app.applicationId === application.applicationId);
    if (exists) {
      throw new Error('Application ID already exists');
    }

    // Add metadata
    const newApp = {
      ...application,
      id: this.generateId(),
      dateAdded: new Date().toISOString(),
      lastAccessed: null, // Will be set when form is filled
      notes: application.notes || ''
    };

    this.applications.push(newApp);
    await this.saveApplications();
    return newApp;
  }

  /**
   * Update existing application
   */
  async updateApplication(id, updates) {
    const index = this.applications.findIndex(app => app.id === id);
    if (index === -1) {
      throw new Error('Application not found');
    }

    this.applications[index] = {
      ...this.applications[index],
      ...updates,
      id: this.applications[index].id, // Preserve ID
      dateAdded: this.applications[index].dateAdded, // Preserve dateAdded
      lastAccessed: this.applications[index].lastAccessed // Preserve lastAccessed
    };

    await this.saveApplications();
    return this.applications[index];
  }

  /**
   * Delete application
   */
  async deleteApplication(id) {
    const index = this.applications.findIndex(app => app.id === id);
    if (index === -1) {
      throw new Error('Application not found');
    }

    this.applications.splice(index, 1);
    await this.saveApplications();
  }

  /**
   * Clear all applications
   */
  async clearAllApplications() {
    this.applications = [];
    await this.saveApplications();
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(id) {
    const app = this.applications.find(app => app.id === id);
    if (app) {
      app.lastAccessed = new Date().toISOString();
      await this.saveApplications();
    }
  }

  /**
   * Get all applications with expiration status
   */
  getApplicationsWithStatus() {
    return this.applications.map(app => ({
      ...app,
      expirationStatus: this.getExpirationStatus(app)
    }));
  }

  /**
   * Calculate expiration status
   * @returns {Object} Status object with days, urgency, and message
   */
  getExpirationStatus(app) {
    const referenceDate = app.lastAccessed || app.dateAdded;
    const daysSinceAccess = this.getDaysSince(referenceDate);
    const daysUntilExpiration = 30 - daysSinceAccess;

    let urgency, color, message;

    if (daysSinceAccess >= 30) {
      urgency = 'expired';
      color = '#dc3545'; // Red
      message = 'EXPIRED - Re-access immediately';
    } else if (daysSinceAccess >= 26) {
      urgency = 'critical';
      color = '#dc3545'; // Red
      message = `${daysUntilExpiration} days until expiration`;
    } else if (daysSinceAccess >= 15) {
      urgency = 'warning';
      color = '#ffc107'; // Yellow
      message = `${daysUntilExpiration} days until expiration`;
    } else {
      urgency = 'safe';
      color = '#28a745'; // Green
      message = `${daysUntilExpiration} days until expiration`;
    }

    return {
      daysSinceAccess,
      daysUntilExpiration,
      urgency,
      color,
      message,
      lastAccessedDate: referenceDate ? new Date(referenceDate).toLocaleDateString() : 'Never'
    };
  }

  /**
   * Calculate days since a date
   */
  getDaysSince(dateString) {
    if (!dateString) return 999; // Large number if never accessed
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Import applications from JSON
   */
  async importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const imported = [];
      const errors = [];

      for (const app of data.applications || data) {
        try {
          const newApp = await this.addApplication(app);
          imported.push(newApp);
        } catch (error) {
          errors.push({ application: app.applicationId, error: error.message });
        }
      }

      return { imported: imported.length, errors };
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Export applications to JSON
   */
  exportToJSON() {
    const data = {
      exportDate: new Date().toISOString(),
      applications: this.applications
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get applications needing refresh (sorted by urgency)
   */
  getApplicationsNeedingRefresh() {
    return this.getApplicationsWithStatus()
      .filter(app => app.expirationStatus.urgency !== 'safe')
      .sort((a, b) => {
        // Sort by urgency: expired > critical > warning
        const urgencyOrder = { expired: 0, critical: 1, warning: 2 };
        return urgencyOrder[a.expirationStatus.urgency] - urgencyOrder[b.expirationStatus.urgency];
      });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Search applications
   */
  searchApplications(query) {
    const lowerQuery = query.toLowerCase();
    return this.applications.filter(app =>
      app.applicationId.toLowerCase().includes(lowerQuery) ||
      app.surname.toLowerCase().includes(lowerQuery) ||
      (app.notes && app.notes.toLowerCase().includes(lowerQuery))
    );
  }
}

// Export singleton instance
window.ds160RetrievalService = new DS160RetrievalService();
