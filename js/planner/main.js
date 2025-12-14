// ============================================================
// MAIN ENTRY POINT
// ============================================================
import Simulation from './simulation.js';

// Make Simulation available globally for button onclick handlers
window.Simulation = Simulation;

// Initialize on page load (auto-starts internally)
document.addEventListener('DOMContentLoaded', () => {
    Simulation.init();
});
