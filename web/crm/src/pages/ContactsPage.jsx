import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { app, ensureLogin } from '../utils/cloudbase';

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    department: '',
    notes: ''
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      await ensureLogin();
      const db = app.database();
      const res = await db.collection('crm_contacts').orderBy('name', 'asc').get();
      setContacts(res.data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ensureLogin();
      const db = app.database();
      await db.collection('crm_contacts').add({
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setShowModal(false);
      setFormData({
        name: '',
        title: '',
        company: '',
        email: '',
        phone: '',
        department: '',
        notes: ''
      });
      loadContacts();
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = ['#FF6B35', '#004E89', '#1A535C', '#F7B801', '#10B981', '#8B5CF6'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-black text-white p-8 border-b-4 border-white"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-6xl font-black tracking-tighter mb-2">
              CONTACTS
            </h1>
            <p className="text-gray-400 uppercase text-sm tracking-wider">
              Your professional network
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white text-black px-8 py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-200 transition-colors border-4 border-white"
          >
            + Add Contact
          </button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : contacts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-black p-12 text-center"
          >
            <p className="text-2xl font-black mb-4">NO CONTACTS</p>
            <p className="text-gray-500 mb-6">Start building your network</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-8 py-3 text-sm uppercase font-bold"
            >
              Add Contact
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact, index) => (
              <motion.div
                key={contact._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border-4 border-black p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-16 h-16 flex items-center justify-center text-white text-xl font-black flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(contact.name) }}
                  >
                    {getInitials(contact.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black tracking-tight truncate">
                      {contact.name}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">{contact.title}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                      {contact.company}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 border-t-2 border-gray-200 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs uppercase tracking-wider min-w-[60px]">
                      Email
                    </span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-xs font-mono hover:underline truncate"
                    >
                      {contact.email}
                    </a>
                  </div>
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wider min-w-[60px]">
                        Phone
                      </span>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-xs font-mono hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.department && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wider min-w-[60px]">
                        Dept
                      </span>
                      <span className="text-xs font-bold">{contact.department}</span>
                    </div>
                  )}
                </div>

                {contact.notes && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-200">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {contact.notes}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-4 border-black p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black uppercase">Add Contact</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-3xl font-bold hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                    placeholder="CEO, Manager, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  placeholder="Sales, Engineering, etc."
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border-2 border-black p-3 focus:outline-none focus:border-4 h-32"
                  placeholder="Additional information about this contact..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-800 transition-colors"
                >
                  Add Contact
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border-2 border-black py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
