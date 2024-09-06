db.createUser({
    user: process.env.SIH_ADMIN_USERNAME,
    pwd: process.env.SIH_ADMIN_PASSWORD,
    roles: [
        {
            role: 'readWrite',
            db: process.env.MONGO_INITDB_DATABASE
        }
    ]
});