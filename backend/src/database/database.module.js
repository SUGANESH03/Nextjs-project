
const { Module, Global } = require('@nestjs/common');
const DatabaseService = require('./database.service');

class DatabaseModule {}

Global()(DatabaseModule);

Module({
    providers: [
        {
            provide: DatabaseService,
            useFactory: () => new DatabaseService()
        }
    ],
    exports: [DatabaseService]
})(DatabaseModule);

module.exports = DatabaseModule;
