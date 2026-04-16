const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { get, run } = require("../db");
const secret = process.env.JWT_SECRET || "secretkey";

exports.register = async (req, res) => {
  const { name, email, password, gender, chattiness } = req.body || {};

  try {
    const userExists = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (userExists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await run(
      `INSERT INTO users(id, name, email, password, gender, chattiness) VALUES (?,?,?,?,?,?)`,
      [id, name, email, hashedPassword, gender || null, chattiness || "BlaBla"]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, gender, chattiness, carModel, carColor, carPlate } = req.body || {};
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    await run(
      `UPDATE users SET name = COALESCE(?, name), gender = COALESCE(?, gender), chattiness = COALESCE(?, chattiness), carModel = COALESCE(?, carModel), carColor = COALESCE(?, carColor), carPlate = COALESCE(?, carPlate) WHERE id = ?`,
      [name, gender, chattiness, carModel, carColor, carPlate, userId]
    );
    res.json({ message: "Profile updated successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProfile = async (req, res) => {
  const userId = req.params.id || req.user?.id;
  try {
    const user = await get(`SELECT id, name, email, role, gender, chattiness, carModel, carColor, carPlate, emailVerified, phoneVerified, govIdVerified FROM users WHERE id = ?`, [userId]);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) return res.status(400).json({ message: "User not found" });
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ message: "Invalid password" });
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: "1h" });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = (req, res) => {
  res.json({ message: "Logout successful (delete token on frontend)" });
};
