import { GreyCat } from '@greycat/sdk';

// default `url` is `http://127.0.0.1:8080`
const greycat = await GreyCat.init();

// await greycat.call('project::helloWorld');

// await greycat.call('project::getArrayOfIntegers');

// const response = await greycat.call('project::greet', ['John', 'Doe']);
// console.log(response);

// await greycat.call('project::addPeople', ['John Doe']);
// await greycat.call('project::addPeople', ['Sarah Smith']);

await greycat.call('project::getPeople');