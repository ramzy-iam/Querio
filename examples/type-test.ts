import { defineModel, text, uuid, integer, boolean, timestamp } from '../src/index';

// Test d'inférence de types
const User = defineModel({
  table: 'users',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    email: text({ unique: true }),
    age: integer(),
  }
});

console.log('User fields type test:');
console.log('id field:', User.fields.id);
console.log('name field:', User.fields.name);
console.log('age field:', User.fields.age);
console.log('isActive field:', User.fields.isActive);

export { User };
