const User = require("../models/User");

// @desc    Get all users (customers, delivery_partners, admins)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    
    // Don't fetch passwords
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, phone, mapUrl, address, password, isNoticed } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (phone !== undefined) user.phone = phone;
    if (mapUrl !== undefined) user.mapUrl = mapUrl;
    if (address !== undefined) user.address = address;
    if (password) user.password = password;
    if (isNoticed !== undefined) user.isNoticed = isNoticed;

    const updatedUser = await user.save();
    
    // Remove password from response
    updatedUser.password = undefined;

    res.json({ user: updatedUser, message: "User updated successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser
};
