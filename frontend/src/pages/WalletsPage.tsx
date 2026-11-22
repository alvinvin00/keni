import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { wallets as walletsApi } from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import type { WalletResponse } from '../lib/types';
import { getSupportedCurrencies } from '../lib/fx';

export function WalletsPage() {
  const { t } = useTranslation();
  const { wallets, refresh, setActiveWallet } = useWallet();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editWallet, setEditWallet] = useState<WalletResponse | null>(null);
  const [deleteWallet, setDeleteWallet] = useState<WalletResponse | null>(null);
  const [form, setForm] = useState({ name: '', currency: 'USD', type: 'debit' as 'debit' | 'credit', credit_limit: '', closing_day: '', due_day: '' });
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);

  useEffect(() => {
    getSupportedCurrencies().then(setCurrencies);
  }, []);

  const openCreate = () => {
    setForm({ name: '', currency: 'USD', type: 'debit', credit_limit: '', closing_day: '', due_day: '' });
    setShowCreate(true);
  };

  const openEdit = (w: WalletResponse) => {
    setForm({
      name: w.name,
      currency: w.currency,
      type: w.type,
      credit_limit: w.credit_limit != null ? String(w.credit_limit) : '',
      closing_day: w.closing_day != null ? String(w.closing_day) : '',
      due_day: w.due_day != null ? String(w.due_day) : '',
    });
    setEditWallet(w);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: {
        name: string;
        currency: string;
        type: 'debit' | 'credit';
        credit_limit?: number | null;
        closing_day?: number | null;
        due_day?: number | null;
      } = { name: form.name, currency: form.currency, type: form.type };
      if (form.type === 'credit') {
        payload.credit_limit = form.credit_limit.trim() ? Number(form.credit_limit) : undefined;
        payload.closing_day = form.closing_day.trim() ? Number(form.closing_day) : undefined;
        payload.due_day = form.due_day.trim() ? Number(form.due_day) : undefined;
      }
      if (editWallet) {
        await walletsApi.update(editWallet.id, payload);
        toast(t('wallets.toastUpdated'), 'success');
        setEditWallet(null);
      } else {
        await walletsApi.create(payload);
        toast(t('wallets.toastCreated'), 'success');
        setShowCreate(false);
      }
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteWallet) return;
    setSaving(true);
    try {
      await walletsApi.delete(deleteWallet.id);
      toast(t('wallets.toastDeleted'), 'success');
      setDeleteWallet(null);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('wallets.title')}</h1>
          <p className="page-subtitle">{t('wallets.subtitle')}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-md" onClick={openCreate}>
            <Plus size={16} /> {t('wallets.new')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {wallets.map((w) => (
          <div
            key={w.id}
            style={{
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid var(--cream-darker)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{w.name}</span>
                  {w.type === 'credit' && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'var(--forest-tint)',
                        color: 'var(--forest)',
                      }}
                    >
                      {t('wallets.creditBadge')}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{w.currency}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="icon-btn" onClick={() => openEdit(w)} title="Edit">
                  <Pencil size={14} />
                </button>
                <button className="icon-btn" onClick={() => setDeleteWallet(w)} title="Delete" style={{ color: 'var(--rose)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                to={`/wallets/${w.id}`}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setActiveWallet(w)}
              >
                {t('wallets.viewTransactions')} <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>
      <Modal
        open={showCreate || !!editWallet}
        onClose={() => { setShowCreate(false); setEditWallet(null); }}
        title={editWallet ? t('wallets.modalEditTitle') : t('wallets.modalCreateTitle')}
        footer={
          <>
            <button className="btn btn-secondary btn-md" onClick={() => { setShowCreate(false); setEditWallet(null); }}>{t('common.cancel')}</button>
            <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <span className="btn-spinner" />}
              {editWallet ? t('wallets.saveChanges') : t('wallets.createWallet')}
            </button>
          </>
        }
      >
        <div className="input-group">
          <label className="input-label">{t('wallets.fieldName')}</label>
          <input
            className="input"
            placeholder={t('wallets.fieldNamePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="input-group">
          <label className="input-label">{t('wallets.fieldCurrency')}</label>
          <SearchableSelect
            value={form.currency}
            onChange={(v) => setForm({ ...form, currency: v })}
            options={currencies.map((c) => ({ value: c, label: c }))}
            searchPlaceholder={t('wallets.currencySearchPlaceholder')}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-md"
            style={{
              flex: 1,
              background: form.type === 'debit' ? 'var(--forest)' : 'var(--cream-dark)',
              color: form.type === 'debit' ? 'var(--cream)' : 'var(--ink-mid)',
              border: form.type === 'debit' ? '1px solid var(--forest)' : '1px solid var(--sand)',
            }}
            onClick={() => setForm({ ...form, type: 'debit' })}
          >
            {t('wallets.typeDebit')}
          </button>
          <button
            type="button"
            className="btn btn-md"
            style={{
              flex: 1,
              background: form.type === 'credit' ? 'var(--forest)' : 'var(--cream-dark)',
              color: form.type === 'credit' ? 'var(--cream)' : 'var(--ink-mid)',
              border: form.type === 'credit' ? '1px solid var(--forest)' : '1px solid var(--sand)',
            }}
            onClick={() => setForm({ ...form, type: 'credit' })}
          >
            {t('wallets.typeCredit')}
          </button>
        </div>
        {form.type === 'credit' && (
          <>
            <div className="input-group">
              <label className="input-label">{t('wallets.fieldCreditLimit')}</label>
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={form.credit_limit}
                onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">{t('wallets.fieldClosingDay')}</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1–31"
                  value={form.closing_day}
                  onChange={(e) => setForm({ ...form, closing_day: e.target.value })}
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">{t('wallets.fieldDueDay')}</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1–31"
                  value={form.due_day}
                  onChange={(e) => setForm({ ...form, due_day: e.target.value })}
                />
              </div>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!deleteWallet}
        onClose={() => setDeleteWallet(null)}
        title={t('wallets.deleteTitle')}
        footer={
          <>
            <button className="btn btn-secondary btn-md" onClick={() => setDeleteWallet(null)}>{t('common.cancel')}</button>
            <button className="btn btn-danger btn-md" onClick={handleDelete} disabled={saving}>
              {saving && <span className="btn-spinner" />}
              {t('common.delete')}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--ink-mid)' }}
          dangerouslySetInnerHTML={{ __html: t('wallets.deleteConfirm', { name: deleteWallet?.name ?? '' }) }}
        />
      </Modal>
    </div>
  );
}
