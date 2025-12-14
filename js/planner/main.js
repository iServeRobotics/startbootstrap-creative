// ============================================================
// MAIN ENTRY POINT
// ============================================================
import Simulation from './simulation.js';

// Make Simulation available globally for button onclick handlers
window.Simulation = Simulation;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Simulation.init();
});
