const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Location = require("../models/Location");
const Plot = require("../models/Plot");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("../config/db");

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Location.deleteMany({});
    await Plot.deleteMany({});

    console.log("Cleared existing data");

    // Create super admin
    const mypassword = "admin123";
    const superAdmin = await User.create({
      name: "Super Admin",
      email: "superadmin@example.com",
      password: mypassword,
      role: "superadmin",
    });

    console.log("Super admin created");

    // Create regular admin
    const admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: mypassword,
      role: "admin",
    });

    console.log("Admin created");

    // Create locations
    const location1 = await Location.create({
      name: "Downtown Area",
      address: "123 Main Street, Downtown",
      totalExpectedAmount: 0,
      totalPaidAmount: 0,
      totalExpenses: 0,
    });

    const location2 = await Location.create({
      name: "Suburban Heights",
      address: "456 Oak Avenue, Suburb",
      totalExpectedAmount: 0,
      totalPaidAmount: 0,
      totalExpenses: 0,
    });

    console.log("Locations created");

    // Create plots
    const plot1 = await Plot.create({
      name: "Plot A - Residential",
      locationId: location1._id,
      expectedAmount: 5000,
      paidAmount: 0,
      expenses: 1000,
      users: [],
    });

    const plot2 = await Plot.create({
      name: "Plot B - Commercial",
      locationId: location1._id,
      expectedAmount: 8000,
      paidAmount: 0,
      expenses: 2000,
      users: [],
    });

    const plot3 = await Plot.create({
      name: "Plot C - Mixed Use",
      locationId: location2._id,
      expectedAmount: 6000,
      paidAmount: 0,
      expenses: 1500,
      users: [],
    });

    console.log("Plots created");

    // Add plots to locations
    location1.plots = [plot1._id, plot2._id];
    location2.plots = [plot3._id];
    await location1.save();
    await location2.save();

    // Create users
    const user1 = await User.create({
      name: "John Doe",
      email: "john@example.com",
      password: mypassword,
      role: "user",
      plotId: plot1._id,
      paymentStatus: "paid",
      paidAmount: 100,
    });

    const user2 = await User.create({
      name: "Jane Smith",
      email: "jane@example.com",
      password: mypassword,
      role: "user",
      plotId: plot1._id,
      paymentStatus: "pending",
      paidAmount: 0,
    });

    const user3 = await User.create({
      name: "Bob Johnson",
      email: "bob@example.com",
      password: mypassword,
      role: "user",
      plotId: plot2._id,
      paymentStatus: "partial",
      paidAmount: 50,
    });

    const user4 = await User.create({
      name: "Alice Williams",
      email: "alice@example.com",
      password: mypassword,
      role: "user",
      plotId: plot3._id,
      paymentStatus: "pending",
      paidAmount: 0,
    });

    console.log("Users created");

    // Add users to plots
    plot1.users = [user1._id, user2._id];
    plot2.users = [user3._id];
    plot3.users = [user4._id];
    await plot1.save();
    await plot2.save();
    await plot3.save();

    // Update plot totals
    const updatePlotTotals = async (plot) => {
      const users = await User.find({ plotId: plot._id });
      const totalPaid = users.reduce((sum, u) => sum + (u.paidAmount || 0), 0);
      plot.paidAmount = totalPaid;
      await plot.save();
      return totalPaid;
    };

    await updatePlotTotals(plot1);
    await updatePlotTotals(plot2);
    await updatePlotTotals(plot3);

    // Update location totals
    const updateLocationTotals = async (location) => {
      const plots = await Plot.find({ locationId: location._id });
      location.totalExpectedAmount = plots.reduce(
        (sum, p) => sum + (p.expectedAmount || 0),
        0,
      );
      location.totalPaidAmount = plots.reduce(
        (sum, p) => sum + (p.paidAmount || 0),
        0,
      );
      location.totalExpenses = plots.reduce(
        (sum, p) => sum + (p.expenses || 0),
        0,
      );
      await location.save();
    };

    await updateLocationTotals(location1);
    await updateLocationTotals(location2);

    console.log("All data seeded successfully!");
    console.log("\nLogin Credentials:");
    console.log("Super Admin: superadmin@example.com / admin123");
    console.log("Admin: admin@example.com / admin123");
    console.log("User: john@example.com / admin123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
