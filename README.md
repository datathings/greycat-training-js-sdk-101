# JS Training 101

This introductory training will guide you through the basics of the GreyCat JavaScript SDK.

This repository contains the completed tutorial. But it is advised to follow the readme rather than cloning the repository.

## Prerequisites

### Python

- Node.js >= 18

### GreyCat setup

Install GreyCat from this link: https://get.greycat.io/

If the installation is successful, you should be able to run the following command:
```sh
greycat -v
```
And it should display the version:
```
6.4.40-dev
```
> This tutorial has been written with `greycat@6.4.40-dev`, your version might differ.

### Node.js setup
Let's initialize a Node.js package by copy/pasting the following into `package.json`
```json
{
  "name": "training-js-101",
  "private": true,
  "type": "module",
  "dependencies": {
    "@greycat/sdk": "https://get.greycat.io/files/sdk/js/dev/6.4/6.4.7-dev.tgz"
  }
}
```
> This tutorial has been written with `@greycat/sdk@6.4.7-dev`, your version might differ.
>
> You can see what the latest version is at [get.greycat.io](https://get.greycat.io)

Running `npm install` now will download and install the `@greycat/sdk` package:
```sh
npm install
```

We are now ready to use GreyCat with the JS SDK.

## GreyCat server application
Create an empty file named: `project.gcl`
```sh
touch project.gcl
```

Then start a GreyCat server with:
```bash
greycat serve --user=1
```
> `--user=1` disables authentication as it is not relevant for this tutorial

Open a new terminal, and create a new file at `src/index.js`
```sh
mkdir src
touch src/index.js
```
The following code instantiates a client to the GreyCat server:
```js
// in src/index.js
import { GreyCat } from '@greycat/sdk';
// default `url` is `http://127.0.0.1:8080`
const greycat = await GreyCat.init();
```
> `GreyCat.init({ ... })` accepts many different options.
> 
> By default, if no `url` is defined, it will connect to `http://127.0.0.1:8080` which is what we want in this tutorial.

### Hello, World!
Providing a server endpoint is as simple as annotating a function with `@expose`.

In `project.gcl`, add the following function definition:
```gcl
@expose
fn helloWorld() {
  println("Hello, world!");
}
```

Because we have modified `project.gcl`, we need to restart GreyCat for it to take it into account.

> This is going to be a recurrent action to do, everytime we modify `project.gcl`

Lets add a call to that `helloWorld()` function from JavaScript in `src/index.js`:
```js
await greycat.call('project::helloWorld');
```
We can now run that code using Node.js:
```sh
node src/index.js
```
Expectedly, this call results in a greeting printed on GreyCat server terminal.

> Setting `NODE_ENV=development` before the command `node src/index.js` will add debug log to every `call(...)` made.
> ```sh
> NODE_ENV=development node src/index.js
> GreyCat { method: 'project::helloWorld', params: undefined, response: null }
> ```

### Getting a response back

Endpoints may yield results, for instance the following returns an array of integers:
```gcl
@expose
fn getArrayOfIntegers(): Array<int> {
  return [1, 7, int::max];
}
```
Following the same pattern as for `helloWorld()`, the result can be retrieved with:
```js
const data = await greycat.call('project::getArrayOfIntegers');
```

> GreyCat `int` are stored as 64 bits signed integers, which means they can potentially overflow the limit of JavaScript `number` (which is `2^53 - 1`).
> For this, the SDK will automatically return a `number` when possible and ultimately fallback to `bigint` when the value might overflow. Running this with `NODE_ENV=development` will display the fact that the latest number is indeed a `bigint`

```sh
NODE_ENV=development node src/index.js
GreyCat {
  method: 'project::getArrayOfIntegers',
  params: undefined,
  response: [ 1, 7, 9223372036854775807n ]
}
```
Notice the `n` after `9223372036854775807n` which tells us that this value is a `bigint`.

> Make sure you've restarted GreyCat after adding the new `getArrayOfIntegers()` endpoint.

### Sending data
Conversely, GreyCat endpoints may also accept parameters.

In `project.gcl` file, add the following function:
```gcl
@expose
fn greet(firstName: String, lastName: String): String {
  var greeting = "Hello, ${firstName} ${lastName}!";
  println(greeting);
  return greeting;
}
```
The `greycat.call(...)` method accepts a second optional argument, which is an array of arguments to be send to the GreyCat endpoint:
```js
const response = await greycat.call('project::greet', ['John', 'Doe']);
console.log(response);
```
> Here, `'John'` will be given for parameter `firstName`, and `'Doe'` will be given for parameter `lastName`.
```sh
NODE_ENV=development node src/index.js
GreyCat {
  method: 'project::greet',
  params: [ 'John', 'Doe' ],
  response: 'Hello, John Doe!'
}
Hello, John Doe!
```
This code will greet John Doe both on GreyCat server and JavaScript client sides.

### GreyCat is a database
GreyCat being a temporal graph database, we can leverage that in order to persist data on the server.

In `project.gcl` lets define a module variable named: `people`.

This is going to be a list of people that will be persisted accross server restart, just like in any database would do.
```gcl
var people: nodeList<String>;

fn main() {
  people ?= nodeList<String>::new();
}
```

> We have added a `main()` function, which is the default entrypoint for GreyCat.
> In this entrypoint, we've said: "initialize `people` to an empty nodeList if it is not already initialized". This is done by the operator `?=`.
>
> Everytime you execute `greycat run` or `greycat serve`, by default, GreyCat will run the `project::main` function if it exists.
>
> This means that the first time you execute GreyCat, it will initialize the `people: nodeList<String>` module variable, but any subsequent executions will not touch that already initialized variable.

Let's add an endpoint to modify that list, and one to return it:
```gcl
@expose
@write
fn addPeople(name: String) {
  people.add(name);
}

@expose
fn getPeople(): Array<String> {
  var res = Array<String>::new(people.size());
  for (index, value in people) {
    res[index] = value;
  }
  return res;
}
```
We added a new annotation to `addPeople(...)` endpoint: `@write`. This is to tell GreyCat that this endpoint will in-fact mutate the graph.

Again, we restart GreyCat and we use those new endpoints in our JavaScript file `src/index.js`:

```js
await greycat.call('project::addPeople', ['John Doe']);
await greycat.call('project::addPeople', ['Sarah Smith']);

await greycat.call('project::getPeople');
```
This should yield:
```sh
NODE_ENV=development node src/index.js
GreyCat {
  method: 'project::addPeople',
  params: [ 'John Doe' ],
  response: null
}
GreyCat {
  method: 'project::addPeople',
  params: [ 'Sarah Smith' ],
  response: null
}
GreyCat {
  method: 'project::getPeople',
  params: undefined,
  response: [ 'John Doe', 'Sarah Smith' ]
}
```

If we stop GreyCat now (using `Ctrl+C`) and then restart it. We can still get the list of people from it.

Lets comment-out the calls to `addPeople` in `src/index.js`:
```js
// await greycat.call('project::addPeople', ['John Doe']);
// await greycat.call('project::addPeople', ['Sarah Smith']);

await greycat.call('project::getPeople');
```

And call it again:
```sh
NODE_ENV=development node src/index.js
GreyCat {
  method: 'project::getPeople',
  params: undefined,
  response: [ 'John Doe', 'Sarah Smith' ]
}
```

We do have the response we expected.