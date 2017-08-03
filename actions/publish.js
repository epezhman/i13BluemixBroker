function main(params) {
    var date = new Date();
    console.log("Published at: " + date.toLocaleString());
    return { message: "Published at: " + date.toLocaleString() };
}