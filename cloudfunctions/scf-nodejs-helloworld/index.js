exports.main = async (event, context) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("Received context:", JSON.stringify(context, null, 2));
    return {  
        "hello": "world",
        "event": event,
        "context": context
    }
}