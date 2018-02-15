
let testObj ={
    "subType" : "sum",
    "matchingMethodInput": ["a", "b"],
    "matchingMethodBody": "return a + b"
};

let sm = new Function(testObj["matchingMethodInput"], testObj["matchingMethodBody"]);

console.log(sm(2, 6));

assert(typeof sm(2, 6) === "string")