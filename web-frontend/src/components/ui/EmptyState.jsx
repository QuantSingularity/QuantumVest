import React from "react";

const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state">
    {icon && <div className="empty-state-icon">{icon}</div>}
    {title && <h4>{title}</h4>}
    {description && <p>{description}</p>}
    {action && <div style={{ marginTop: "var(--space-sm)" }}>{action}</div>}
  </div>
);

export default EmptyState;
