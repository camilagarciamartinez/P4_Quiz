const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require('./model');
const Sequelize = require('sequelize');


/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log("Commandos:");
    log("  h|help - Muestra esta ayuda.");
    log("  list - Listar los quizzes existentes.");
    log("  show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log("  add - Añadir un nuevo quiz interactivamente.");
    log("  delete <id> - Borrar el quiz indicado.");
    log("  edit <id> - Editar el quiz indicado.");
    log("  test <id> - Probar el quiz indicado.");
    log("  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("  credits - Créditos.");
    log("  q|quit - Salir del programa.");
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
  models.quiz.findAll()
      .then(quizzes => {
        quizzes.forEach(quiz=> {
          log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        });
      })
      .catch(error => {
        errorlog(error.message);
      })
      .then(()=> {
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
exports.showCmd = (rl, id) => {
    validateId(id)
  .then(id => models.quiz.findById(id))
  .then(quiz => {
    if (!quiz) {
      throw new Error(`No existe un quiz asociado al id=${id}.`);
    }
    log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(error => {
    errorlog(error.message);
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
exports.addCmd = rl => {

    makeQuestion(rl, 'Introduzca una pregunta: ')
  .then(q => {
    return makeQuestion(rl, 'Introduzca la respuesta: ')
    .then(a => {
      return {question: q, answer: a};
    });
  })
  .then(quiz => {
    return models.quiz.create(quiz);
  })
  .then(quiz => {
    log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  })
  .catch(Sequelize.ValidationError, error => {
    error.log('El quiz es erroneo: ');
    error.errors.forEach(({message}) => errorlog(message));
  })
  .catch(error => {
    errorlog(error.message);
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
exports.deleteCmd = (rl, id) => {
    validateId(id)
  .then(id => models.quiz.destroy({where: {id}}))
  .catch(error => {
    errorlog(error.message);
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
exports.editCmd = (rl, id) => {
   validateId(id)
     .then(id => models.quiz.findById(id))
     .then(quiz => {
       if (!quiz) {
         throw new Error(`No existe un quiz asociado al id=${id}.`);
       }
       process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
       return makeQuestion(rl, 'Introduzca la pregunta: ')
       .then(q => {
         process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
         return makeQuestion(rl, 'Introduzca la respuesta: ')
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
       log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
     })
     .catch(Sequelize.ValidationError, error => {
       errorlog('El quiz es erróneo');
       error.errors.forEach(({message}) => errorlog(message));
     })
     .catch(error => {
       errorlog(error.message);
     })
     .then(error => {
       rl.prompt();
     });
   };


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {

    validateId(id)
     .then(id => models.quiz.findById(id))
     .then(quiz => {
       if (!quiz) {
         throw new Error(`No existe un quiz asociado al id=${id}.`);
       }

   log(` [${colorize(id,'magenta')}]: ${quiz.question}`);
     return makeQuestion(rl,'Introduzca la respuesta: ')
        .then(a => {
    if(a.toLowerCase().trim() === quiz.answer.toLowerCase()){
      log("Su respuesta es correcta.");
      log("Correcta","green");

    }else{
          log("Su respuesta es incorrecta.");
          log("Incorrecta","red");
        }
    });
  })
.catch(Sequelize.ValidationError,error =>{
  errorlog('Quiz no válido: ');
  error.errors.forEach(({message}) => errorlog(message));
})
.catch(error => {
  errorlog(error.message);
})
.then(() => {
  rl.prompt();
});
};

/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = rl => {

const playOne = () => {
        
        let rnd = Math.floor(Math.random()*toBeResolved.length);
        id = toBeResolved[rnd];

        if (toBeResolved.length === 0) {
            log('No hay nada más que preguntar.');
            log(`Fin del juego. Aciertos: ${score}`);
            log(`${score}`, 'magenta');
            rl.prompt();
        }

        toBeResolved.splice(rnd, 1);
        
        validateId(id)

        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id = ${id}.`);
            }
            return makeQuestion(rl, `${quiz.question}? `)
            .then(a => {
                return {preg: a, resp: quiz.answer};
            });
        })
        .then(b => {
            if (b.preg.trim().toLowerCase() === b.resp.trim().toLowerCase()){
                score += 1;
                log(`CORRECTO - LLeva ${score} aciertos.`);
                if (toBeResolved.length === 0){
                    log('No hay nada más que preguntar.');
                    log(`Fin del juego. Aciertos: ${score}`);
                    log(`${score}`, 'magenta');
                } else {
                    playOne();
                }

            } else {
                log('INCORRECTO.');
                log(`Fin del juego. Aciertos: ${score}`);
                log(`${score}`, 'magenta');
                rl.prompt();
            }
        })
        .catch(Sequelize.ValidationError, error => {
            errlog('El quiz es erróneo');
            error.errors.forEach(({message}) => errlog(message));
        })
        .catch(error => {
            errlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
    }

    let score = 0;
    let toBeResolved = [];

    models.quiz.findAll()
    .each(quiz => {
        toBeResolved.push(quiz.id);
    })
    .then(() => {
        return playOne();
    })

    .catch(Sequelize.ValidationError, error => {
       errorlog('El quiz es erróneo');
       error.errors.forEach(({message}) => errorlog(message));
     })
     .catch(error => {
       errorlog(error.message);
     })
     .then(error => {
       rl.prompt();
     });
   };

/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log('Autores de la práctica:');
    log('Camila García Martínez', 'green');
    rl.prompt();
};


/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};

