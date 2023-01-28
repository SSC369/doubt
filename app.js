const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const dbPath = path.join(__dirname, "todoApplication.db");
app.use(express.json());
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

let convertToCamelCase = (dbResponse) => {
  return {
    id: dbResponse.id,
    todo: dbResponse.todo,
    priority: dbResponse.priority,
    status: dbResponse.status,
    category: dbResponse.category,
    dueDate: dbResponse.due_date,
  };
};

const logger = (request, response, next) => {
  let statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  let priorityValues = ["HIGH", "MEDIUM", "LOW"];
  let categoryValues = ["WORK", "HOME", "LEARNING"];

  let requestQuery = request.query;
  if (JSON.stringify(requestQuery) === "{}") {
    next();
  } else {
    if (
      requestQuery.priority !== undefined &&
      requestQuery.status !== undefined
    ) {
      if (
        priorityValues.includes(requestQuery.priority) &&
        statusValues.includes(requestQuery.status)
      ) {
        next();
      } else {
        if (!priorityValues.includes(requestQuery.priority)) {
          response.status(400);
          response.send("Invalid Todo Priority");
        } else if (!statusValues.includes(requestQuery.status)) {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      }
    } else if (
      requestQuery.priority !== undefined &&
      requestQuery.category !== undefined
    ) {
      if (
        priorityValues.includes(requestQuery.priority) &&
        categoryValues.includes(requestQuery.category)
      ) {
        next();
      } else {
        if (!priorityValues.includes(requestQuery.priority)) {
          response.status(400);
          response.send("Invalid Todo Priority");
        } else if (!categoryValues.includes(requestQuery.category)) {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      }
    } else if (requestQuery.category !== undefined) {
      if (categoryValues.includes(requestQuery.category)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else if (requestQuery.priority !== undefined) {
      if (priorityValues.includes(requestQuery.priority)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
    } else if (requestQuery.status !== undefined) {
      if (statusValues.includes(requestQuery.status)) {
        next();
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    } else if (requestQuery.search_q !== undefined) {
      next();
    }
  }
};

app.get("/todos/", logger, async (request, response) => {
  const hasPriorityAndStatusProperties = (requestQuery) => {
    return (
      requestQuery.priority !== undefined && requestQuery.status !== undefined
    );
  };
  const hasCategoryAndPriorityProperties = (requestQuery) => {
    return (
      requestQuery.category !== undefined && requestQuery.priority !== undefined
    );
  };

  const hasCategoryProperty = (requestQuery) => {
    return requestQuery.category !== undefined;
  };

  const hasPriorityProperty = (requestQuery) => {
    return requestQuery.priority !== undefined;
  };

  const hasStatusProperty = (requestQuery) => {
    return requestQuery.status !== undefined;
  };

  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category, date } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query): //if this is true then below query is taken in the code
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}'
    AND priority = '${priority}';`;
      break;
    case hasCategoryAndPriorityProperties(request.query):
      getTodosQuery = `
        SELECT *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%'
      AND category = '${category}'
      AND priority = '${priority}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
        SELECT *
        FROM todo
        WHERE 
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;

    default:
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%';`;
  }

  dbResponse = await db.all(getTodosQuery);
  response.send(dbResponse.map((item) => convertToCamelCase(item)));
});

app.get("/todos/:todoId", async (request, response) => {
  let { todoId } = request.params;
  let query = `
    SELECT *
    FROM todo
    WHERE id = ${todoId};`;

  let dbResponse = await db.get(query);
  response.send(convertToCamelCase(dbResponse));
});

app.delete("/todos/:todoId", async (request, response) => {
  let { todoId } = request.params;

  let query = `
    DELETE FROM
    todo
    WHERE 
    id = ${todoId};`;

  let dbResponse = await db.run(query);
  response.send("Todo Deleted");
});

let format = require("date-fns/format");
var isValid = require("date-fns/isValid");
let parseISO = require("date-fns/parseISO");

app.get("/agenda/", async (request, response) => {
  let { date } = request.query;
  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const isDateValid = isValid(new Date(date));
    if (isDateValid) {
      let newDate = format(new Date(date), "yyyy-MM-dd");
      let query = ` 
    SELECT id, todo, priority, status, category, due_date AS dueDate
    FROM todo 
    WHERE
    due_date = '${newDate}';`;

      let dbResponse = await db.all(query);
      response.send(dbResponse);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});
let loggerPost = (request, response, next) => {
  let requestBody = request.body;
  let statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  let priorityValues = ["HIGH", "MEDIUM", "LOW"];
  let categoryValues = ["WORK", "HOME", "LEARNING"];

  if (
    statusValues.includes(requestBody.status) &&
    priorityValues.includes(requestBody.priority) &&
    categoryValues.includes(requestBody.category) &&
    isValid(parseISO(requestBody.dueDate))
  ) {
    next();
  } else {
    if (!statusValues.includes(requestBody.status)) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else if (!priorityValues.includes(requestBody.priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else if (!categoryValues.includes(requestBody.category)) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
};

app.post("/todos/", loggerPost, async (request, response) => {
  let details = request.body;
  let { id, todo, priority, status, category, dueDate } = details;
  let query = `
    INSERT INTO todo (id, todo, priority, status, category, due_date)
    VALUES(
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${dueDate}'
    );`;

  let dbResponse = await db.run(query);
  const todoId = dbResponse.lastID;
  response.send("Todo Successfully Added");
});

const loggerPut = (request, response, next) => {
  let statusValues = ["TO DO", "IN PROGRESS", "DONE"];
  let priorityValues = ["HIGH", "MEDIUM", "LOW"];
  let categoryValues = ["WORK", "HOME", "LEARNING"];

  let requestBody = request.body;

  if (requestBody.status !== undefined) {
    if (statusValues.includes(requestBody.status)) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (requestBody.category !== undefined) {
    if (categoryValues.includes(requestBody.category)) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (requestBody.priority !== undefined) {
    if (priorityValues.includes(requestBody.priority)) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (requestBody.dueDate !== undefined) {
    if (isValid(parseISO(requestBody.dueDate))) {
      next();
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else if (requestBody.todo !== undefined) {
    if (requestBody.todo !== "") {
      next();
    }
  }
};

app.put("/todos/:todoId", loggerPut, async (request, response) => {
  let { todoId } = request.params;

  let updatedColumn = "";

  let requestBody = request.body;

  switch (true) {
    case requestBody.todo !== undefined:
      updatedColumn = "Todo";
      break;
    case requestBody.priority !== undefined:
      updatedColumn = "Priority";
      break;
    case requestBody.status !== undefined:
      updatedColumn = "Status";
      break;
    case requestBody.category !== undefined:
      updatedColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updatedColumn = "Due Date";
      break;
  }

  let query = `
  SELECT *
    FROM todo
    WHERE id = ${todoId};`;

  let previousTodo = await db.get(query);

  let {
    priority = previousTodo.priority,
    todo = previousTodo.todo,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  let dbQuery = `
    UPDATE
    todo
    SET
    todo = '${todo}',
    status = '${status}',
    priority = '${priority}',
    due_date = '${dueDate}',
    category = '${category}'
    WHERE id = ${todoId};`;

  let dbResponse = await db.run(dbQuery);

  response.send(`${updatedColumn} Updated`);
});

module.exports = app;
