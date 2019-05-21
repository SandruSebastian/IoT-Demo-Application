module.exports = function(app, db) {
    app.post('/postStatus', (req, res) => {
        // You'll create your note here.
        console.log(req.body);
        res.send('Hello')
    });
    app.get('/getStatus', (req, res) => {
        // You'll create your note here.
        console.log(req.body);
        res.send(dummy_payload());
    });
};


const dummy_payload = () => ({
        node0: {
            name : 'node1',
            data : [{ sensor: 'temp', value: `${getRandomArbitrary(21,22)} Celsius` }, { sensor: 'hum', value: `${getRandomArbitrary(45,55)}%` }]
        },
        node1: {
            name : 'node2',
            data : [{ sensor: 'proximity', value: `${getRandomArbitrary(5,10)}cm` }]
        }
});

function getRandomArbitrary(min, max) {
    const a =  Math.random() * (max - min) + min;
    return parseFloat(Math.round(a * 100) / 100).toFixed(2);
}

