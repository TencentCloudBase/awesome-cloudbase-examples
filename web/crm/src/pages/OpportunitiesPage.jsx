import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { app, ensureLogin } from '../utils/cloudbase';

const OpportunitiesPage = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    value: '',
    stage: 'prospecting',
    probability: '10',
    expectedCloseDate: '',
    description: ''
  });

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      await ensureLogin();
      const db = app.database();
      const res = await db.collection('crm_opportunities').orderBy('createdAt', 'desc').get();
      setOpportunities(res.data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ensureLogin();
      const db = app.database();
      await db.collection('crm_opportunities').add({
        ...formData,
        value: parseFloat(formData.value) || 0,
        probability: parseInt(formData.probability) || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setShowModal(false);
      setFormData({
        title: '',
        company: '',
        value: '',
        stage: 'prospecting',
        probability: '10',
        expectedCloseDate: '',
        description: ''
      });
      loadOpportunities();
    } catch (error) {
      console.error('Failed to add opportunity:', error);
    }
  };

  const stages = [
    { value: 'prospecting', label: 'Prospecting', color: '#F7B801' },
    { value: 'qualification', label: 'Qualification', color: '#FF6B35' },
    { value: 'proposal', label: 'Proposal', color: '#004E89' },
    { value: 'negotiation', label: 'Negotiation', color: '#1A535C' },
    { value: 'closed-won', label: 'Closed Won', color: '#10B981' },
    { value: 'closed-lost', label: 'Closed Lost', color: '#EF4444' }
  ];

  const getStageInfo = (stage) => {
    return stages.find(s => s.value === stage) || stages[0];
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
              OPPORTUNITIES
            </h1>
            <p className="text-gray-400 uppercase text-sm tracking-wider">
              Sales pipeline management
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white text-black px-8 py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-200 transition-colors border-4 border-white"
          >
            + New Deal
          </button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Pipeline Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-4 border-black p-6 mb-8"
        >
          <h2 className="text-xl font-black uppercase mb-4">Pipeline Stages</h2>
          <div className="grid grid-cols-6 gap-2">
            {stages.map((stage, index) => {
              const count = opportunities.filter(o => o.stage === stage.value).length;
              return (
                <div
                  key={stage.value}
                  className="text-center p-4 border-2 border-gray-200"
                  style={{ borderLeftColor: stage.color, borderLeftWidth: '4px' }}
                >
                  <p className="text-2xl font-black">{count}</p>
                  <p className="text-xs uppercase tracking-wider mt-1">{stage.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : opportunities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-black p-12 text-center"
          >
            <p className="text-2xl font-black mb-4">NO OPPORTUNITIES</p>
            <p className="text-gray-500 mb-6">Start tracking your sales pipeline</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-8 py-3 text-sm uppercase font-bold"
            >
              Create Opportunity
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {opportunities.map((opp, index) => {
              const stageInfo = getStageInfo(opp.stage);
              return (
                <motion.div
                  key={opp._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border-4 border-black p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black tracking-tight mb-2">
                        {opp.title}
                      </h3>
                      <p className="text-gray-600 font-bold">{opp.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Value</p>
                      <p className="text-3xl font-black">¥{opp.value.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Stage</p>
                      <span
                        className="inline-block px-3 py-1 text-xs font-bold uppercase text-white"
                        style={{ backgroundColor: stageInfo.color }}
                      >
                        {stageInfo.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Probability</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 h-2">
                          <div
                            className="bg-black h-full"
                            style={{ width: `${opp.probability}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-black">{opp.probability}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Expected Close</p>
                      <p className="font-bold text-sm">
                        {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                  </div>

                  {opp.description && (
                    <p className="text-sm text-gray-600 border-t-2 border-gray-200 pt-4">
                      {opp.description}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Opportunity Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-4 border-black p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black uppercase">New Opportunity</h2>
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
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  placeholder="e.g., Enterprise Software Deal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Value (¥) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  >
                    {stages.map(stage => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border-2 border-black p-3 focus:outline-none focus:border-4 h-32"
                  placeholder="Deal details, requirements, notes..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-800 transition-colors"
                >
                  Create Opportunity
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

export default OpportunitiesPage;
