const app = require("express")(),
    bodyParser = require("body-parser"),
    //Para rodar no heroku precisa adicionar o comando process.env.PORT
    port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
//PERMISSAO PARA PEGAR INFORMACOES DA PAGINA
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE, OPTIONS");
    next();
});

//Connect all our routes to our application
app.use("/user",require("./routes/user"));
app.use("/flight",require("./routes/flight"));
app.use("/order",require("./routes/order"));


// Turn on that server!
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log("Para derrubar o servidor: ctrl + c")
});