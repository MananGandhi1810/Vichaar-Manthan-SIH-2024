db.createUser({
    user: process.env.AIP_ADMIN_USERNAME,
    pwd: process.env.AIP_ADMIN_PASSWORD,
    roles: [
        {
            role: "readWrite",
            db: process.env.MONGO_INITDB_DATABASE,
        },
    ],
});
