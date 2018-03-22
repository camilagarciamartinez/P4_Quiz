const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');
const Sequelize = require('sequelize');


/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = (socket, rl) => {
  log(socket, "Commandos:");
  log(socket, " h|help - Muestra esta ayuda.");
  log(socket, " list - Listar los quizzes existentes.");
  log(socket, " show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
  log(socket, " add - Añadir un nuevo quiz interactivamente.");
  log(socket, " delete <id> - Borrar el quiz indicado.");
  log(socket, " edit <id> - Editar el quiz indicado.");
  log(socket, " test <id> - Probar el quiz indicado.");
  log(socket, " p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  log(socket, " credits - Créditos.");
  log(socket, " q|quit - Salir del programa.");
  rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = (socket, rl) => {
  models.quiz.findAll()
  .each(quiz => {
    log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
  })
  .catch(error => {
    errlog(socket, error.message);
  })
  .then(() => {
    rl.prompt();
  });
};

/* Esta función devuelve una promesa que:
* - Valida que se ha introducido un valor para el parametro.
* - Convierte el parametro en un numero entero.
* Si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
* 
* @param id Parametro con el indice a validar
*/

const validateId = id => {
  return new Sequelize.Promise((resolve, reject) => {
    if (typeof id === "undefined"){
      reject(new Error(`Falta el parametro <id>.`));
    } else {
      id = parseInt(id);  //coger la parte entera y descartar lo demas
      if(Number.isNaN(id)) {
        reject(new Error(`El valor del parámetro <id> no es un número.`));
      } else {
        resolve(id);
      }
    }
  });
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (socket, id, rl) => {
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz) {
      throw new Error(`No existe un quiz asociado al id = ${id}.`);
    }
    log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(error => {
    errlog(socket, error.message);
  })
  .then(() => {
    rl.prompt();
  });
};


const makeQuestion = (rl, text) => {
  return new Sequelize.Promise((resolve, reject) => {
    rl.question(colorize(text, 'red'), answer => {
      resolve(answer.trim());
    });
  });
};

/**
 * Añade un nuevo quiz al módelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = (socket, rl) => {
  makeQuestion(rl, ' Introduzca una pregunta: ')
  .then(q => {
    return makeQuestion(rl, ' Introduzca la respuesta: ')
    .then(a => {
      return {question: q, answer: a};
    })
  })
  .then(quiz => {
    return models.quiz.create(quiz);
  })
  .then(quiz => {
    log(socket, ` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    errlog(socket, 'El quiz es erróneo: ');
    error.errors.forEach(({message}) => errlog(socket, message));
  })
  .catch(error => {
    errlog(socket, error.message);
  })
  .then(() => {
    rl.prompt();
  });
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (socket, id, rl) => {
  validateId(id)
  .then(id => models.quiz.destroy({where: {id}}))
  .catch(error => {
    errlog(socket, error.message);
  })
  .then(() => {
    rl.prompt();
  });
};


/**
 * Edita un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (socket, id, rl) => {
  validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz) {
      throw new Error(`No existe un quiz asociado al id = ${id}.`);
    }
    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
    return makeQuestion(rl, ' Modifique la pregunta: ')
    .then(q => {
      process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
      return makeQuestion(rl, ' Modifique la respuesta: ')
      .then(a => {
        quiz.question = q;
        quiz.answer = a;
        return quiz;
      });
    });
  })
  .then(quiz => {
    return quiz.save();
  })
  .then(quiz => {
    log(socket, ` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    errlog(socket, 'El quiz es erróneo: ');
    error.errors.forEach(({message}) => errlog(socket, message));
  })
  .catch(error => {
    errlog(socket, error.message);
  })
  .then(() => {
    rl.prompt();
  });
};

/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (socket, rl, id) => {

    return new Promise ((resolve, reject) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
      if (!quiz) {
        throw new Error(`No existe un quiz asociado al id = ${id}.`);
      }
      return makeQuestion(rl, ` ¿${quiz.question}? `)
      .then(a => {
        return {user: a, real: quiz.answer};
      });
    })
    .then(b => {
      if (b.user.trim().toLowerCase() === b.real.trim().toLowerCase()){
        log(socket, 'Su respuesta es correcta.');
        log(socket, 'Correcta', 'green');
        resolve();
        rl.prompt();

      } else {
        log(socket, 'Su respuesta es incorrecta.');
        og(socket, 'Incorrecta', 'red');
        resolve();
        rl.prompt();
      }
    })
    .catch(Sequelize.ValidationError, error => {
      errlog(socket, 'El quiz es erróneo: ');
      error.errors.forEach(({message}) => errlog(socket, message));
    })
    .catch(error => {
      errlog(socket, error.message);
    })
    .then(() => {
      rl.prompt();
    });
  });
};

/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = (socket, rl) => {
let score = 0;
let toBeResolved = [];

    models.quiz.findAll()
    .then(quizzes => {
        return new Sequelize.Promise((resolve, reject) => {
            toBeResolved = quizzes;
            resolve();
            return;
        })
        
    })
    .then(() => {
        return playOne();
    })
    .catch(Sequelize.ValidationError, error => {
        errlog('El quiz es erróneo: ');
        error.errors.forEach(({message}) => errlog(socket,message));
    })
    .catch(error => {
        errlog(socket,error.message);
    })
    .then(() => {
        rl.prompt();
        return;
    });

    const playOne = () => {

        return new Sequelize.Promise ((resolve, reject) => {
           
            if (toBeResolved.length === 0) {
                log(socket,`No hay nada más que preguntar. Fin del juego. Aciertos: ${score}`);
                resolve();
                rl.prompt();
                log(`${score}`, 'magenta');
            
            } else {
                let rnd = Math.floor(Math.random()*toBeResolved.length);
                let quiz = toBeResolved[rnd];
                toBeResolved.splice(rnd, 1);
                if (!quiz) {
                    throw new Error(`No existe un quiz asociado al id = ${id}.`);
                } else {
                    makeQuestion(rl, ` ${quiz.question}? `)
                   .then(answer => {
                        if (answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
                            score =+1 ;
                            log(socket,` CORRECTO - LLeva ${score} aciertos.`);
                            if (toBeResolved.length === 0){
                                log(socket,` No hay nada más que preguntar. Fin del juego. Aciertos: ${score}`);
                                log(socket,`${score}`, 'magenta');
                                resolve();
                                rl.prompt();

                            } else {
                                resolve(playOne());
                                rl.prompt();
                            }
                        } else {
                                log(socket,`INCORRECTO. Fin del juego. Aciertos: ${score}`);
                                log(socket,score, 'magenta');
                                resolve();
                                rl.prompt();
                        }
                    })
                }
            }
        });
    }
};


/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = (socket, rl) => {
    log(socket,'Autores de la práctica:');
    log(socket,'Camila García Martínez', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = (socket, rl) => {
    rl.close();
    socket.end();
};

