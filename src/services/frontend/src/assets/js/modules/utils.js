export const showAlert = (message, type = 'success') => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fixed-top text-center`;
    alertDiv.textContent = message;
    document.body.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
};

export class Utils {
    static escapeHtml(unsafe) {
        if (unsafe == null) return ''; // Handle null and undefined
        
        return String(unsafe)  // Convert to string in case of numbers or other types
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}