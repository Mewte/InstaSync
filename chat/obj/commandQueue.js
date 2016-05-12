//Stores an array that holds timestamps in seconds, if all array elements are equal, then the server should disconnect the client

function commandQueue(commandsPerSecond)
{
    var queue = new Array();
    for (var i = 0; i < commandsPerSecond; i++) //give every indice a seperate value
    {
        queue[i] = i;
    }
    this.addCommand = function()
    {
        queue.push(Math.floor(new Date().getTime() / 1000));
        queue.shift();
    };
    this.checkFlood = function() //check if all values are equal
    {
        for (var i = 0; i < queue.length; i++)
        {
            if (queue[0] !== queue[i])
            {
                return false;
            }
        }
        return true;
    };
}
module.exports.create = function(commandsPerSecond)
{
    var thisCommandQueue = new commandQueue(commandsPerSecond);
    return thisCommandQueue;
}