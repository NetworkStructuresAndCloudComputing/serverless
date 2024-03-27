const mailgun = require('mailgun-js');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Initialize Mailgun client
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: 'mg.cloudcomputingzakirmemon.me',
});

// Initialize Sequelize instance (replace with your database credentials)
const sequelize = new Sequelize(process.env.DATABASE_NAME, process.env.DATABASE_USERNAME, process.env.DATABASE_PASSWORD, {
  host: process.env.HOST,
  dialect: 'mysql',
  logging: false,
});


// Define User model schema
const userSchema = {
  uid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  account_created: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  account_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  expirationTime: {
    type: DataTypes.DATE
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }
};

const User = sequelize.define('Users', userSchema, {
  createdAt: 'account_created',
  updatedAt: 'account_updated',
});

User.sync()
  .then(() => {
    console.log('User table created successfully.');
  })
  .catch((error) => {
    console.error('Error creating User table:', error);
  });

// Cloud Function entry point
exports.verifyEmail = async (event, context) => {
  const pubsubMessage = event.data ? Buffer.from(event.data, 'base64').toString() : null;

  if (pubsubMessage) {
    const payload = JSON.parse(pubsubMessage);
    const email = payload.email;
    const userId = payload.userId;
    const expiryTime = new Date(Date.now() + 2 * 60 * 1000); // Set expiration time for 2 minutes
    const verificationLink = `http://cloudcomputingzakirmemon.me:3000/v1/user/verify_user/${userId}`;

    try {
      const data = {
        from: 'Excited User <mailgun@sandbox-123.mailgun.org>',
        to: email,
        subject: 'Hello',
        html: `
          <!-- Plain text version of the email -->
          Please click the following link to verify your email address: ${verificationLink}
          <!-- HTML version of the email -->
          <h1>Testing some Mailgun awesomeness!</h1>
        `,
      };

      await mg.messages().send(data);
      console.log('Verification email sent successfully.');

      const user = await User.findOne({ where: { uuid:  userId} });
      await user.update({ expirationTime: expiryTime });

      console.log('Verification email details saved successfully.');
    } catch (error) {
      console.error('Error handling verification email:', error);
    }
  } else {
    console.log('No data received in the Pub/Sub message.');
  }
};