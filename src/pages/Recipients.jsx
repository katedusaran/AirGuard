import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNotificationRecipients } from '../hooks/useNotificationRecipients';
import '../styles/Recipients.css';

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export default function Recipients() {
  const { recipients, loading, error, addRecipient, setRecipientActive, deleteRecipient } = useNotificationRecipients();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [label, setLabel] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pendingId, setPendingId] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const number = phoneNumber.trim();
    if (!E164_PATTERN.test(number)) {
      setFormError('Enter a valid E.164 number, for example +639171234567.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await addRecipient({ phoneNumber: number, label: label.trim() });
      setPhoneNumber('');
      setLabel('');
    } catch (submitError) {
      setFormError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (recipient) => {
    setPendingId(recipient.id);
    setActionError('');
    try {
      await setRecipientActive(recipient.id, !recipient.active);
    } catch (toggleError) {
      setActionError(toggleError.message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (recipient) => {
    if (!window.confirm(`Delete ${recipient.phone_number} permanently?`)) return;

    setPendingId(recipient.id);
    setActionError('');
    try {
      await deleteRecipient(recipient.id);
    } catch (deleteError) {
      setActionError(deleteError.message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="recipients-page">
      <div className="recipients-heading">
        <div>
          <h1 className="page-title">Notification Recipients</h1>
          <p>Manage the phone numbers that receive AirGuard SMS notifications.</p>
        </div>
      </div>

      <section className="card recipient-form-card">
        <div className="card-header"><h2>Add recipient</h2></div>
        <form className="recipient-form" onSubmit={handleSubmit} noValidate>
          <label>
            Phone number <span aria-hidden="true">*</span>
            <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+639171234567" inputMode="tel" required />
          </label>
          <label>
            Label <span className="recipient-optional">Optional</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Facility Manager" />
          </label>
          <button className="recipient-add-btn" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add recipient'}</button>
        </form>
        {formError && <p className="recipient-message error" role="alert">{formError}</p>}
      </section>

      <section className="card recipients-table-card">
        <div className="card-header"><h2>Recipients ({recipients.length})</h2></div>
        {error ? <p className="recipient-message error" role="alert">Unable to load recipients: {error}</p> : actionError ? <p className="recipient-message error" role="alert">{actionError}</p> : null}
        {loading ? <div className="dashboard-loading">Loading recipients…</div> : (
          <div className="recipients-table-wrap">
            <table className="recipients-table">
              <thead><tr><th>Label</th><th>Phone number</th><th>Status</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {recipients.length === 0 ? <tr><td colSpan="4" className="recipients-empty">No notification recipients added yet.</td></tr> : recipients.map((recipient) => {
                  const pending = pendingId === recipient.id;
                  return <tr key={recipient.id}>
                    <td>{recipient.label || '—'}</td>
                    <td className="recipient-phone">{recipient.phone_number}</td>
                    <td><button type="button" className={`recipient-toggle${recipient.active ? ' active' : ''}`} onClick={() => handleToggle(recipient)} disabled={pending} aria-pressed={recipient.active}>{recipient.active ? 'Active' : 'Inactive'}</button></td>
                    <td><button type="button" className="recipient-delete-btn" onClick={() => handleDelete(recipient)} disabled={pending} aria-label={`Delete ${recipient.phone_number}`}><Trash2 size={16} /></button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
