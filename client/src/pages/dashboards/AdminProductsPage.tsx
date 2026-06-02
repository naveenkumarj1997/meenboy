import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  uploadAdminImage,
} from "../../lib/api";
import type { ProductPayload, CutPayload } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const ADMIN_NAV_LINKS = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Profile", href: "/dashboard/admin/profile" },
  { label: "New Customers", href: "/dashboard/admin/new-customers" },
  { label: "New Delivery Partners", href: "/dashboard/admin/partner-approvals" },
  { label: "Products", href: "/dashboard/admin/products" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

const CATEGORIES = ["Seafood", "Fish", "Chicken", "Mutton", "Country Chicken"];

const AdminProductsPage = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProductPayload>({
    name: "",
    category: CATEGORIES[0],
    unit: "kg",
    description: "",
    minPrice: 0,
    maxPrice: 0,
    image: "",
    availableCuts: [],
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getAdminProducts();
      setProducts(res.data.products);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig]);

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingId(product._id);
      setFormData({
        name: product.name,
        category: product.category,
        unit: product.unit || "kg",
        description: product.description || "",
        minPrice: product.minPrice,
        maxPrice: product.maxPrice,
        image: product.image || "",
        availableCuts: product.availableCuts || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        category: CATEGORIES[0],
        unit: "kg",
        description: "",
        minPrice: 0,
        maxPrice: 0,
        image: "",
        availableCuts: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleAddCut = () => {
    setFormData((prev) => ({
      ...prev,
      availableCuts: [...(prev.availableCuts || []), { name: "", price: 0, description: "" }],
    }));
  };

  const handleRemoveCut = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      availableCuts: prev.availableCuts?.filter((_, i) => i !== index),
    }));
  };

  const handleCutChange = (index: number, field: keyof CutPayload, value: string | number) => {
    setFormData((prev) => {
      const newCuts = [...(prev.availableCuts || [])];
      newCuts[index] = { ...newCuts[index], [field]: value };
      return { ...prev, availableCuts: newCuts };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    
    try {
      setUploadingImage(true);
      const res = await uploadAdminImage(token, file);
      setFormData((prev) => ({ ...prev, image: res.url }));
    } catch (err: any) {
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingId) {
        await updateAdminProduct(token, editingId, formData);
      } else {
        await createAdminProduct(token, formData);
      }
      handleCloseModal();
      fetchProducts();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteAdminProduct(token, id);
      fetchProducts();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <DashboardShell
      title="Manage Products"
      description="Add, edit, and remove products from the catalog."
      navLinks={ADMIN_NAV_LINKS}
    >
      {(() => {
        const filteredProducts = products.filter(p => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
        });

        filteredProducts.sort((a, b) => {
          if (sortConfig.key === "name") {
            return sortConfig.direction === "asc" 
              ? a.name.localeCompare(b.name) 
              : b.name.localeCompare(a.name);
          } else {
            return sortConfig.direction === "asc"
              ? a.minPrice - b.minPrice
              : b.minPrice - a.minPrice;
          }
        });

        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
        const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        return (
          <>
            <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Product Catalog</h3>
        <button
          onClick={() => handleOpenModal()}
          className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Product
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-slate-400 text-sm">Sort by:</span>
          <select 
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm"
            value={`${sortConfig.key}-${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split("-");
              setSortConfig({ key, direction });
            }}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {error && <div className="text-red-400 bg-red-950/50 p-4 rounded-xl border border-red-900 mb-6">{error}</div>}

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="p-4 text-slate-400 font-medium">Product</th>
              <th className="p-4 text-slate-400 font-medium">Category</th>
              <th className="p-4 text-slate-400 font-medium">Price Range</th>
              <th className="p-4 text-slate-400 font-medium">Status</th>
              <th className="p-4 text-slate-400 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No products found.
                </td>
              </tr>
            ) : (
              currentProducts.map((p) => (
                <tr key={p._id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                        {p.image ? (
                          <img 
                            src={p.image.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${p.image}` : p.image} 
                            alt={p.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No img</div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{p.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-300">{p.category}</td>
                  <td className="p-4 text-teal-400 font-medium">
                    ₹{p.minPrice} - ₹{p.maxPrice} / {p.unit || 'kg'}
                  </td>
                  <td className="p-4">
                    {p.isActive ? (
                      <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="text-slate-400 hover:text-teal-400 px-2 py-1 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="text-slate-400 hover:text-red-400 px-2 py-1 transition-colors ml-2"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredProducts.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
          </div>
          <div className="flex gap-2 items-center">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm text-slate-300">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h3 className="text-2xl font-bold text-white">
                {editingId ? "Edit Product" : "Add New Product"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as "kg" | "piece" })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="kg">per Kg (fractional quantity)</option>
                    <option value="piece">per Piece / No (whole quantity)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Min Price</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Max Price</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxPrice}
                    onChange={(e) => setFormData({ ...formData, maxPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                      placeholder="URL or Upload ->"
                    />
                    <label className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap">
                      {uploadingImage ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="mb-6 border-t border-slate-800 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-white">Available Cuts</h4>
                  <button
                    type="button"
                    onClick={handleAddCut}
                    className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Add Cut
                  </button>
                </div>

                {formData.availableCuts?.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No cuts added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.availableCuts?.map((cut, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex gap-4 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <input
                              required
                              type="text"
                              placeholder="Cut Name"
                              value={cut.name}
                              onChange={(e) => handleCutChange(idx, "name", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                            />
                          </div>
                          <div>
                            <input
                              required
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Price"
                              value={cut.price}
                              onChange={(e) => handleCutChange(idx, "price", Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              placeholder="Description (optional)"
                              value={cut.description || ""}
                              onChange={(e) => handleCutChange(idx, "description", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCut(idx)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-lg font-bold transition-colors"
                >
                  {editingId ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
        );
      })()}
    </DashboardShell>
  );
};

export default AdminProductsPage;
