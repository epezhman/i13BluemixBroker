function main(params) {
    var date = new Date();
    console.log("Subscribed at: " + date.toLocaleString());
    return { message: "Subscribed at: " + date.toLocaleString() };
}