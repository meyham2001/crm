import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Inbox, Search } from "lucide-react";

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="back-link">
      <ArrowLeft size={14} />
      {label}
    </Link>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…"
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box">
      <Search size={15} />
      <input
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="page-header-actions">{children}</div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading-block">
      <div className="spinner" />
      Loading…
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
