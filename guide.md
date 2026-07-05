# Restaurant Reservation Management System Guide

Welcome to the **Restaurant Reservation Management System**! This application is a full-stack solution designed to streamline table bookings for customers and provide comprehensive tools for restaurant administrators to manage reservations and seating capacity.

This guide details how to use the system both as a **Customer** (regular user) and as an **Administrator**, explaining the user flows, dashboard functionalities, and seating assignment rules.

---

## 1. Access & Authentication

The application can be accessed via the live deployment URL:
👉 **[Live Application](https://restaurant-reservation-system-722h.onrender.com)**

### Creating an Account (Registration)
When you first open the app, you will be presented with the login screen. Toggle the switch at the top to **Register** to create a new account:
1. **Customer Registration**:
   * Enter your **Name**, **Email**, and **Password** (minimum 8 characters).
   * Leave the **Admin code** field empty.
   * Click **Create account**.
2. **Admin Registration**:
   * Enter your **Name**, **Email**, and **Password** (minimum 8 characters).
   * Enter the secure registration code in the **Admin code** field: `AdminSecureCode123`
   * Click **Create account**. This automatically grants your account the `admin` role and authorization.

### Logging In
Once an account is created, toggle back to **Login**:
* Enter your registered **Email** and **Password**.
* Click **Login**. The system securely stores your login token (JWT) so you remain authenticated.

---

## 2. Customer Guide

If you log in as a customer, you will see the **Customer Dashboard**, split into two sections:

### Creating a New Reservation (Left Panel)
The reservation system automatically assigns the best table for you based on availability:
1. **Select Date**: Click the date input. You cannot select dates in the past.
2. **Select Time Slot**: Select a 30-minute slot from the dropdown menu. Supported slots are:
   * `17:00`, `17:30`, `18:00`, `18:30`, `19:00`, `19:30`, `20:00`, `20:30`, `21:00`
3. **Number of Guests**: Enter the size of your party (between `1` and `20`).
4. **Special Notes**: (Optional) Add any notes for the restaurant (e.g., *"Wheelchair access needed"*, *"Allergy to peanuts"*). Maximum 300 characters.
5. **Reserve**: Click **Reserve table**.
   * **Success**: A green message "Reservation created" will appear, and your table details (Table number and capacity) will show on the right.
   * **Failure**: If the restaurant is fully booked for that slot or no single table can fit your party size, a red alert will explain the conflict (e.g., `Conflict: No suitable table available for this party size`).

### Managing Your Reservations (Right Panel)
This list shows your booking history:
* Each card details the **Date & Time**, **Guest Count**, and **Table Number** assigned to you.
* The badge shows the reservation status: `active` (green) or `cancelled` (red).
* **Cancellation**: To cancel an active reservation, click **Cancel** on the booking card. This immediately releases the table back into the pool so other customers can book it.

---

## 3. Admin Guide

If you log in as an administrator, your dashboard is protected with a secure shield badge next to your name and includes two main tabs: **Reservations** and **Tables**.

### Tab A: Reservations Management
This view allows you to review and manage all reservations across the restaurant:
1. **List of Bookings**: A table displays all bookings showing the guest's name/email, date, time, party size, table number, status, and management actions.
2. **Date Filtering**: 
   * Use the date picker at the top-right of the table to filter bookings for a specific day.
   * Clear the date picker to view all past, present, and future bookings.
   * Click the **Refresh** button next to it to fetch the latest bookings in real-time.
3. **Editing a Booking**:
   * Click the **Edit** button on any active reservation. An inline editing row will appear.
   * You can change the date, time slot, guest count, or notes.
   * Click **Save** to apply. The system will run the seating algorithm to re-assign or validate the table. If a conflict occurs, it will display the error.
4. **Cancelling a Booking**:
   * Click the **Cancel** button on any active booking.
   * Confirm the prompt to cancel. The status updates to `cancelled` and the seating slot is released.

### Tab B: Tables Configuration
This view allows you to adjust the restaurant's seating capacities and layout:
1. **Seating Layout List**: All restaurant tables are listed as cards showing the Table Number, Seat Capacity, and Status (`active` / `inactive`).
2. **Add a Table**: 
   * Under the header, enter a **Table Number** and its **Capacity**.
   * Click **Add table** to save. The table immediately becomes available for reservation bookings.
3. **Editing a Table**:
   * Click **Edit** on a table card to open the inline editor.
   * You can update the table's number, seat capacity, or toggle its **Active** checkbox.
   * Click **Save** to apply.
4. **Deactivating a Table**:
   * Click **Disable** on an active table card.
   * An inactive table remains in the database (preserving past booking history) but is excluded from the seating pool for new bookings or updates.

---

## 4. Under the Hood Seating Logic

For transparency, the system operates on the following programmatic rules:

* **No Overlapping Bookings**: A table can only be reserved by one active party during any given time slot.
* **Smallest Fit First**: The algorithm always assigns the smallest table that can accommodate your party size to keep larger tables open for larger groups. (e.g., if you book for 2 guests, and Table 1 [2 seats] and Table 2 [4 seats] are both free, the system will select Table 1).
* **Strict Double-Booking Protection**: A MongoDB partial database index runs on the server. If two requests attempt to book the exact same table/slot at the same millisecond, the database rejects one, ensuring no double-bookings are ever made.
* **Role Enforcement**: Customer accounts cannot access any of the admin endpoints or API routes. All endpoints are guarded on the server-side with JWT validation.
