function main(params) {
    var date = new Date();
    console.log("Unsubscribed at: " + date.toLocaleString());
    return { message: "Unsubscribed at: " + date.toLocaleString() };
}